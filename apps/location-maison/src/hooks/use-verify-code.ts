/**
 * Hook pour vérifier le code de paiement
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '@/firebase/auth'

interface VerifyCodeRequest {
  code: string
  amount: number
}

interface VerifyCodeResponse {
  success: boolean
  message: string
  credits?: number
  error?: string
}

// Fonction pour vérifier le code via l'API
export async function verifyCodeAPI(data: VerifyCodeRequest): Promise<VerifyCodeResponse> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const token = await user.getIdToken()
  
  const response = await fetch('/api/credits/verify-code', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  const responseData = await response.json()
  
  if (!response.ok) {
    throw new Error(responseData.message || 'Erreur lors de la vérification du code')
  }

  return responseData
}

export function useVerifyCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyCodeAPI,
    onSuccess: async (data) => {
      // Invalider le cache du solde pour forcer un refresh
      await queryClient.invalidateQueries({ queryKey: ['credits-balance'] })
      
      // Invalider l'historique des transactions
      await queryClient.invalidateQueries({ queryKey: ['credits-history'] })

      // Forcer un rafraîchissement immédiat des données
      await queryClient.refetchQueries({ queryKey: ['credits-balance'] })
      
      console.log('Code vérifié avec succès:', data)
    },
    onError: (error: Error) => {
      console.error('Erreur lors de la vérification du code:', error.message)
    }
  })
} 