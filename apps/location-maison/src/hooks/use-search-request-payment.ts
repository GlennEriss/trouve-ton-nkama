'use client'

/**
 * Publication d'une demande de recherche (MoMo), côté visiteur anonyme.
 * initiate → puis polling du statut (3 s) jusqu'à confirmed/failed ou timeout :
 * le visiteur n'a pas d'uid, donc pas d'onSnapshot possible (firestore.rules
 * bloque tout accès client à search_requests avant modération) — le polling
 * passe par /api/search-requests/[transactionId]/status qui n'expose que le
 * strict nécessaire. Même state machine que use-gift-payment.ts.
 */

import React from 'react'

const POLL_INTERVAL_MS = 3_000
// Le payeur doit taper son code MoMo sur son téléphone : on lui laisse 3 min.
const POLL_TIMEOUT_MS = 3 * 60_000

export type SearchRequestPaymentPhase =
  | 'idle'
  | 'initiating'
  | 'waiting_confirmation'
  | 'success'
  | 'failed'
  | 'timeout'

export interface SearchRequestPaymentInput {
  typeProperty: string
  transactionType: 'FOR_RENT' | 'FOR_SALE'
  province: string
  city: string
  neighborhood?: string
  budgetMinXaf: number
  budgetMaxXaf: number
  description: string
  whatsappContact: string
  payerPhone: string
  network: 'AM' | 'MM'
  boostRequested: boolean
}

export function useSearchRequestPayment() {
  const [phase, setPhase] = React.useState<SearchRequestPaymentPhase>('idle')
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

  const submitSearchRequest = React.useCallback(async (input: SearchRequestPaymentInput) => {
    setPhase('initiating')
    setError(null)

    let transactionId: string
    try {
      const response = await fetch('/api/search-requests/initiate', {
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
        const response = await fetch(`/api/search-requests/${encodeURIComponent(transactionId)}/status`)
        if (!response.ok) continue
        const data = (await response.json()) as { status?: string; failureReason?: string | null }

        if (data.status === 'confirmed') {
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

  return { phase, error, submitSearchRequest, reset }
}
