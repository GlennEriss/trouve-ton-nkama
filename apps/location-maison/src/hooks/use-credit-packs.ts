/**
 * Hook pour récupérer les packs de crédits dynamiques.
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { auth } from '@/firebase/auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { CreditPackData } from '@/lib/credits/credit-packs'

interface CreditPacksResponse {
  success: boolean
  packs: CreditPackData[]
  source: 'firestore' | 'defaults'
  message: string
  error?: string
}

function extractErrorMessage(payload: any, fallback: string): string {
  return payload?.message ?? payload?.error?.message ?? fallback
}

async function fetchCreditPacks(): Promise<CreditPacksResponse> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const token = await user.getIdToken()

  const response = await fetch('/api/credits/packs', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Erreur lors du chargement des packs'))
  }

  return payload as CreditPacksResponse
}

export function useCreditPacks() {
  const { user, isLoading: authLoading, isFirebaseConnected, error: authError } = useCurrentUser()

  return useQuery({
    queryKey: ['credits-packs', user?.uid],
    queryFn: fetchCreditPacks,
    enabled: !!user?.uid && isFirebaseConnected && !authLoading,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('authentification') || error?.message?.includes('token')) {
        return false
      }
      if (authError) {
        return false
      }
      return failureCount < 2
    },
  })
}
