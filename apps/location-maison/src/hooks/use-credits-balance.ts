/**
 * Hook pour récupérer le solde de crédits de l'utilisateur
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { auth } from '@/firebase/auth'
import { useCurrentUser } from '@/hooks/use-current-user'

interface BalanceResponse {
  success: boolean
  credits?: number
  message: string
  error?: string
}

async function fetchCreditsBalance(): Promise<BalanceResponse> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const token = await user.getIdToken()
  
  const response = await fetch('/api/credits/balance', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message ?? 'Erreur lors de la récupération du solde')
  }

  return response.json()
}

export function useCreditsBalance() {
  const { user, isLoading: authLoading, isFirebaseConnected, error: authError } = useCurrentUser()

  return useQuery({
    queryKey: ['credits-balance', user?.uid],
    queryFn: fetchCreditsBalance,
    enabled: !!user?.uid && isFirebaseConnected && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      // Ne pas retry si c'est une erreur d'authentification
      if (error.message?.includes('authentification') || error.message?.includes('token')) {
        return false
      }
      // Ne pas retry si l'auth est en erreur
      if (authError) {
        return false
      }
      return failureCount < 3
    }
  })
} 