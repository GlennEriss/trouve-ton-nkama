/**
 * Hook pour initier l'achat de crédits
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '@/firebase/auth'
import { useCurrentUser } from '@/hooks/use-current-user'

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

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message ?? 'Erreur lors de l\'initiation du paiement')
  }

  return response.json()
}

export function useCreditsPurchase() {
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()

  return useMutation({
    mutationFn: purchaseCredits,
    onSuccess: (data) => {
      // Invalider le cache du solde pour forcer un refresh
      queryClient.invalidateQueries({ queryKey: ['credits-balance'] })
      
      // Invalider l'historique des transactions
      queryClient.invalidateQueries({ queryKey: ['credits-history'] })
      
      console.log('Achat initié avec succès:', data)
    },
    onError: (error: Error) => {
      console.error('Erreur lors de l\'achat:', error.message)
    },
    // Désactiver la mutation si l'utilisateur n'est pas connecté
    mutationKey: ['purchase-credits', user?.uid]
  })
} 