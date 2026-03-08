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

function extractErrorMessage(payload: any, fallback: string): string {
  return payload?.message ?? payload?.error?.message ?? fallback
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

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Erreur lors de la récupération du solde'))
  }

  return payload as BalanceResponse
}

export function useCreditsBalance() {
  const { user, isLoading: authLoading, isFirebaseConnected, error: authError } = useCurrentUser()

  return useQuery({
    queryKey: ['credits-balance', user?.uid],
    queryFn: fetchCreditsBalance,
    enabled: !!user?.uid && isFirebaseConnected && !authLoading,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      if (error.message?.includes('authentification') || error.message?.includes('token')) {
        return false
      }
      if (authError) {
        return false
      }
      return failureCount < 3
    }
  })
}
