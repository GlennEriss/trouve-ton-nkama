'use client'

/**
 * Modal d'envoi d'un cadeau (don Mobile Money) à l'annonceur d'un réel.
 * Accessible sans compte : le donateur saisit montant + son numéro MoMo,
 * confirme sur son téléphone (USSD), et le modal suit le paiement par polling.
 */

import React from 'react'
import { AlertCircle, CheckCircle2, Gift, Loader2, Smartphone, X } from 'lucide-react'
import {
  GIFT_AMOUNT_PRESETS,
  GIFT_MAX_AMOUNT_XAF,
  GIFT_MESSAGE_MAX_LENGTH,
  GIFT_MIN_AMOUNT_XAF,
} from '@/constantes/gifts'
import { PAYMENT_METHODS, detectNetworkFromPhone, isPhoneValidForNetwork } from '@/constantes/payment-methods'
import { useGiftPayment } from '@/hooks/use-gift-payment'

interface GiftModalProps {
  isOpen: boolean
  onClose: () => void
  reelId: string
  announcerName?: string | null
}

export default function GiftModal({ isOpen, onClose, reelId, announcerName }: Readonly<GiftModalProps>) {
  const [amount, setAmount] = React.useState<number>(GIFT_AMOUNT_PRESETS[1])
  const [customAmount, setCustomAmount] = React.useState('')
  const [phoneNumber, setPhoneNumber] = React.useState('')
  const [network, setNetwork] = React.useState<'AM' | 'MM'>('AM')
  const [message, setMessage] = React.useState('')
  const { phase, error, sendGift, reset } = useGiftPayment()

  React.useEffect(() => {
    if (!isOpen) {
      reset()
      setCustomAmount('')
      setMessage('')
    }
  }, [isOpen, reset])

  // Auto-détection du réseau depuis le numéro saisi (074→Airtel, 062→Moov…)
  React.useEffect(() => {
    const detected = detectNetworkFromPhone(phoneNumber)
    if (detected) setNetwork(detected)
  }, [phoneNumber])

  if (!isOpen) return null

  const effectiveAmount = customAmount ? Number(customAmount) : amount
  const amountValid =
    Number.isInteger(effectiveAmount) &&
    effectiveAmount >= GIFT_MIN_AMOUNT_XAF &&
    effectiveAmount <= GIFT_MAX_AMOUNT_XAF
  const phoneValid = isPhoneValidForNetwork(phoneNumber, network)
  const canSubmit = amountValid && phoneValid && phase === 'idle'

  const handleSubmit = () => {
    if (!canSubmit) return
    void sendGift({
      reelId,
      amount: effectiveAmount,
      phoneNumber,
      network,
      message: message.trim() || undefined,
    })
  }

  const isBusy = phase === 'initiating' || phase === 'waiting_confirmation'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 md:items-center"
      onClick={() => { if (!isBusy) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Gift className="h-5 w-5 text-pink-600" />
            Offrir un cadeau
          </h2>
          {!isBusy && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {phase === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="font-medium text-slate-900 dark:text-white">Cadeau envoyé, merci !</p>
            <p className="text-sm text-slate-500">
              {announcerName ? `${announcerName} recevra ton soutien.` : "L'annonceur recevra ton soutien."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
            >
              Fermer
            </button>
          </div>
        )}

        {phase === 'waiting_confirmation' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-pink-600" />
            <p className="font-medium text-slate-900 dark:text-white">
              Confirme le paiement sur ton téléphone
            </p>
            <p className="text-sm text-slate-500">
              Tape ton code Mobile Money pour valider le cadeau de{' '}
              {effectiveAmount.toLocaleString('fr-FR')} FCFA.
            </p>
          </div>
        )}

        {(phase === 'failed' || phase === 'timeout') && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="font-medium text-slate-900 dark:text-white">Paiement non abouti</p>
            <p className="text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
            >
              Réessayer
            </button>
          </div>
        )}

        {(phase === 'idle' || phase === 'initiating') && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Montant</p>
              <div className="grid grid-cols-4 gap-2">
                {GIFT_AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { setAmount(preset); setCustomAmount('') }}
                    className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                      !customAmount && amount === preset
                        ? 'border-pink-600 bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                        : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset.toLocaleString('fr-FR')}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="numeric"
                placeholder={`Autre montant (min ${GIFT_MIN_AMOUNT_XAF} FCFA)`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {customAmount && !amountValid && (
                <p className="mt-1 text-xs text-red-500">
                  Montant entier entre {GIFT_MIN_AMOUNT_XAF.toLocaleString('fr-FR')} et{' '}
                  {GIFT_MAX_AMOUNT_XAF.toLocaleString('fr-FR')} FCFA.
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Ton numéro Mobile Money
              </p>
              <div className="mb-2 grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.network}
                    type="button"
                    onClick={() => setNetwork(method.network)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      network === method.network
                        ? 'border-pink-600 bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                        : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {method.name}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="074 XX XX XX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              {phoneNumber && !phoneValid && (
                <p className="mt-1 text-xs text-red-500">
                  Numéro invalide pour ce réseau (Airtel : 074/077 — Moov : 062/065/066).
                </p>
              )}
            </div>

            <div>
              <input
                type="text"
                placeholder="Message d'encouragement (optionnel)"
                value={message}
                maxLength={GIFT_MESSAGE_MAX_LENGTH}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-40"
            >
              {phase === 'initiating' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              Envoyer {amountValid ? `${effectiveAmount.toLocaleString('fr-FR')} FCFA` : 'le cadeau'}
            </button>
            <p className="text-center text-xs text-slate-400">
              Paiement sécurisé Mobile Money. Des frais de service s'appliquent.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
