/**
 * Hook pour récupérer le solde de crédits de l'utilisateur
 */

'use client'

import { useQuery } from '@tanstack/react-query'
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
  const response = await fetch('/api/credits/balance', {
    method: 'GET',
    headers: {
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
  const { user, isLoading: authLoading, error: authError } = useCurrentUser()

  return useQuery({
    queryKey: ['credits-balance', user?.uid],
    queryFn: fetchCreditsBalance,
    enabled: !!user?.uid && !authLoading,
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
