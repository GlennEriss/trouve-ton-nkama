/**
 * Hook pour initier l'achat de crédits
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '@/firebase/auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createLogger } from '@/lib/logger'

const logger = createLogger('hooks.use-credits-purchase')

interface PurchaseRequest {
  packId: string
  code: string
}

interface PurchaseResponse {
  success: boolean
  transactionId?: string
  checkoutUrl?: string
  message: string
  error?: string
}

function extractErrorMessage(payload: any, fallback: string): string {
  return payload?.message ?? payload?.error?.message ?? fallback
}

async function purchaseCredits(data: PurchaseRequest): Promise<PurchaseResponse> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const token = await user.getIdToken()

  const response = await fetch('/api/credits/purchase', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Erreur lors de l\'initiation du paiement'))
  }

  return payload as PurchaseResponse
}

export function useCreditsPurchase() {
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()

  return useMutation({
    mutationFn: purchaseCredits,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['credits-balance'] })
      queryClient.invalidateQueries({ queryKey: ['credits-history'] })

      logger.info('Credit purchase initiated', {
        transactionId: data.transactionId,
        hasCheckoutUrl: Boolean(data.checkoutUrl),
      })
    },
    onError: (error: Error) => {
      logger.error('Credit purchase failed', { error })
    },
    mutationKey: ['purchase-credits', user?.uid]
  })
}
