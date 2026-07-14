import { defineSecret } from 'firebase-functions/params'

// Secrets MyPayGa chargés depuis Firebase Secret Manager en production.
// À déclarer dans les options des fonctions (secrets: MYPAYGA_SECRETS) pour
// que leurs valeurs soient injectées dans process.env au runtime.
export const MYPAYGA_SECRETS = [
  defineSecret('MYPAYGA_API_KEY'),
  defineSecret('MYPAYGA_CALLBACK_SECRET'),
  defineSecret('MYPAYGA_CALLBACK_URL'),
  defineSecret('MYPAYGA_API_BASE_URL'),
  defineSecret('MYPAYGA_COUNTRY'),
  defineSecret('MYPAYGA_CURRENCY'),
  defineSecret('MYPAYGA_SUCCESS_URL'),
  defineSecret('MYPAYGA_FAIL_URL'),
  defineSecret('MYPAYGA_PAYMENT_TIMEOUT_MS'),
  defineSecret('MYPAYGA_GIFT_CALLBACK_URL'),
]

export const MYPAYGA_CONFIG = {
  DEFAULT_API_BASE_URL: 'https://api.mypayga.com',
  DEFAULT_COUNTRY: 'GA',
  DEFAULT_CURRENCY: 'XAF',
  DEFAULT_TIMEOUT_MS: 12000,
  DEFAULT_SUCCESS_URL: 'https://location-maison.vercel.app/my-balance/recharge?payment=success',
  DEFAULT_FAIL_URL: 'https://location-maison.vercel.app/my-balance/recharge?payment=fail',
} as const

export type MyPayGaNetwork = 'AM' | 'MM'

export function getMyPayGaConfig() {
  return {
    apiBaseUrl: trimEnv('MYPAYGA_API_BASE_URL') ?? MYPAYGA_CONFIG.DEFAULT_API_BASE_URL,
    apiKey: trimEnv('MYPAYGA_API_KEY'),
    callbackSecret: trimEnv('MYPAYGA_CALLBACK_SECRET'),
    callbackUrl: trimEnv('MYPAYGA_CALLBACK_URL'),
    giftCallbackUrl: trimEnv('MYPAYGA_GIFT_CALLBACK_URL'),
    successUrl: trimEnv('MYPAYGA_SUCCESS_URL') ?? MYPAYGA_CONFIG.DEFAULT_SUCCESS_URL,
    failUrl: trimEnv('MYPAYGA_FAIL_URL') ?? MYPAYGA_CONFIG.DEFAULT_FAIL_URL,
    country: (trimEnv('MYPAYGA_COUNTRY') ?? MYPAYGA_CONFIG.DEFAULT_COUNTRY).toUpperCase(),
    currency: trimEnv('MYPAYGA_CURRENCY') ?? MYPAYGA_CONFIG.DEFAULT_CURRENCY,
    timeoutMs: Math.max(1500, Number(trimEnv('MYPAYGA_PAYMENT_TIMEOUT_MS')) || MYPAYGA_CONFIG.DEFAULT_TIMEOUT_MS),
  }
}

export function normalizeMyPayGaNetwork(value: unknown): MyPayGaNetwork {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'MM' || normalized === 'MOOV' || normalized === 'MOOV_MONEY') {
    return 'MM'
  }
  return 'AM'
}

export function sanitizePhoneDigits(value: unknown): string {
  return String(value ?? '').replace(/[^\d]/g, '')
}

// Regex de validation des numéros mobile money gabonais par réseau.
// Airtel Money : 074/077 + 6 chiffres — Moov Money : 062/065/066 + 6 chiffres.
const PHONE_REGEX_BY_NETWORK: Record<MyPayGaNetwork, RegExp> = {
  AM: /^(?:074|077)\d{6}$/,
  MM: /^(?:062|065|066)\d{6}$/,
}

/** Retire l'indicatif pays (241) pour obtenir le numéro local à 9 chiffres. */
export function toLocalPhone(value: unknown): string {
  let digits = sanitizePhoneDigits(value)
  if (digits.startsWith('241') && digits.length > 9) {
    digits = digits.slice(3)
  }
  return digits
}

/** Valide le numéro local pour le réseau MyPayGa donné. */
export function isPhoneValidForNetwork(value: unknown, network: MyPayGaNetwork): boolean {
  return PHONE_REGEX_BY_NETWORK[network].test(toLocalPhone(value))
}

function trimEnv(name: string): string | null {
  const value = process.env[name]
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
