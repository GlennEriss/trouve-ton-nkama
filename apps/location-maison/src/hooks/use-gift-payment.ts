'use client'

/**
 * Envoi d'un cadeau (don MoMo) sur un réel, côté donateur anonyme.
 * initiate → puis polling du statut (3 s) jusqu'à success/failed ou timeout :
 * le donateur n'a pas d'uid, donc pas d'onSnapshot possible (firestore.rules
 * bloque tout accès client à gift_transactions) — le polling passe par
 * /api/gifts/[transactionId]/status qui n'expose que le strict nécessaire.
 */

import React from 'react'

const POLL_INTERVAL_MS = 3_000
// Le donateur doit taper son code MoMo sur son téléphone : on lui laisse 3 min.
const POLL_TIMEOUT_MS = 3 * 60_000

export type GiftPaymentPhase =
  | 'idle'
  | 'initiating'
  | 'waiting_confirmation'
  | 'success'
  | 'failed'
  | 'timeout'

export interface GiftPaymentInput {
  reelId: string
  amount: number
  phoneNumber: string
  network: 'AM' | 'MM'
  message?: string
}

export function useGiftPayment() {
  const [phase, setPhase] = React.useState<GiftPaymentPhase>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const pollingRef = React.useRef<{ cancelled: boolean } | null>(null)

  const reset = React.useCallback(() => {
    if (pollingRef.current) {
      pollingRef.current.cancelled = true
      pollingRef.current = null
    }
    setPhase('idle')
    setError(null)
  }, [])

  React.useEffect(() => reset, [reset])

  const sendGift = React.useCallback(async (input: GiftPaymentInput) => {
    setPhase('initiating')
    setError(null)

    let transactionId: string
    try {
      const response = await fetch('/api/gifts/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success || !data?.transactionId) {
        setPhase('failed')
        setError(data?.message ?? "Impossible d'initier le paiement.")
        return
      }
      transactionId = data.transactionId
    } catch {
      setPhase('failed')
      setError('Erreur réseau. Vérifie ta connexion et réessaie.')
      return
    }

    setPhase('waiting_confirmation')

    const polling = { cancelled: false }
    pollingRef.current = polling
    const startedAt = Date.now()

    while (!polling.cancelled) {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setPhase('timeout')
        setError('Le paiement est toujours en attente. Vérifie ton téléphone puis réessaie.')
        return
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      if (polling.cancelled) return

      try {
        const response = await fetch(`/api/gifts/${encodeURIComponent(transactionId)}/status`)
        if (!response.ok) continue
        const data = (await response.json()) as { status?: string; failureReason?: string | null }

        if (data.status === 'success') {
          setPhase('success')
          return
        }
        if (data.status === 'failed') {
          setPhase('failed')
          setError(data.failureReason ?? 'Le paiement a été refusé.')
          return
        }
      } catch {
        // erreur réseau transitoire pendant le polling : on continue
      }
    }
  }, [])

  return { phase, error, sendGift, reset }
}
