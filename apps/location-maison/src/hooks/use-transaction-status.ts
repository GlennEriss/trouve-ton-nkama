/**
 * Hook d'écoute temps réel du statut d'une transaction de crédits.
 *
 * S'abonne au document `credit_transactions/{transactionId}` dans Firestore et
 * reflète son statut au fur et à mesure que le callback du fournisseur de
 * paiement (MyPayGa) le met à jour. Permet à l'UI d'afficher succès / échec
 * sans dépendre de la redirection du navigateur.
 */

'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/firestore'

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled'

interface UseTransactionStatusResult {
  status: TransactionStatus | null
  failureReason: string | null
}

export function useTransactionStatus(transactionId: string | null): UseTransactionStatusResult {
  const [status, setStatus] = useState<TransactionStatus | null>(null)
  const [failureReason, setFailureReason] = useState<string | null>(null)

  useEffect(() => {
    if (!transactionId) {
      setStatus(null)
      setFailureReason(null)
      return
    }

    const ref = doc(db, 'credit_transactions', transactionId)
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.data()
      if (!data) return
      setStatus((data.status ?? null) as TransactionStatus | null)
      setFailureReason((data.failureReason ?? null) as string | null)
    })

    return () => unsubscribe()
  }, [transactionId])

  return { status, failureReason }
}
