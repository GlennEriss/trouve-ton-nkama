/**
 * Moyens de paiement mobile money acceptés (MyPayGa).
 * Partagé entre la liste des packs et la modale de recharge.
 */

export type PaymentNetwork = 'AM' | 'MM'

export interface PaymentMethod {
  id: string
  name: string
  /** Nom de fichier dans /public/assets/balance */
  icon: string
  /** Code réseau MyPayGa */
  network: PaymentNetwork
  /** Regex de validation du numéro local (9 chiffres) pour ce réseau */
  phoneRegex: RegExp
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'airtel',
    name: 'Airtel Money',
    icon: 'airtel-money-logo-3.png',
    network: 'AM',
    phoneRegex: /^(?:074|077)\d{6}$/,
  },
  {
    id: 'moov',
    name: 'Moov Money',
    icon: 'moov-money-logo-2.png',
    network: 'MM',
    phoneRegex: /^(?:062|065|066)\d{6}$/,
  },
]

/**
 * Nettoie un numéro : ne garde que les chiffres et retire l'indicatif
 * pays gabonais (241) s'il est présent, pour obtenir le numéro local à 9 chiffres.
 */
export function sanitizeLocalPhone(value: string): string {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.startsWith('241') && digits.length > 9) {
    digits = digits.slice(3)
  }
  return digits
}

/** Indique si le numéro est valide pour le réseau donné. */
export function isPhoneValidForNetwork(value: string, network: PaymentNetwork): boolean {
  const method = PAYMENT_METHODS.find((m) => m.network === network)
  if (!method) return false
  return method.phoneRegex.test(sanitizeLocalPhone(value))
}

/** Détecte le réseau à partir du préfixe du numéro (ou null si inconnu). */
export function detectNetworkFromPhone(value: string): PaymentNetwork | null {
  const local = sanitizeLocalPhone(value)
  const method = PAYMENT_METHODS.find((m) => m.phoneRegex.test(local))
  return method?.network ?? null
}
