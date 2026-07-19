/**
 * Hook pour récupérer l'historique des transactions de crédits avec pagination
 */

'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getCreditTransactionStats } from '@/db/credit-transaction.db'
import type { HistoryResponse } from '@/models/credit-transaction'

interface HistoryFilters {
  type?: 'all' | 'purchase' | 'spend'
  limit?: number
}

export function useCreditHistory(filters: HistoryFilters = {}) {
  const { user, isLoading: authLoading, error: authError } = useCurrentUser()

  return useInfiniteQuery({
    queryKey: ['credit-history', user?.uid, filters.type],
    queryFn: async ({ pageParam }): Promise<HistoryResponse> => {
      const searchParams = new URLSearchParams({
        type: filters.type ?? 'all',
        limit: String(filters.limit ?? 10),
      })
      if (typeof pageParam === 'string' && pageParam) searchParams.set('cursor', pageParam)

      const response = await fetch(`/api/credits/history?${searchParams.toString()}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.message ?? "Erreur lors de la récupération de l'historique")
      }

      return {
        transactions: payload.transactions ?? [],
        hasMore: Boolean(payload.hasMore),
        lastVisible: payload.nextCursor ?? undefined,
        total: Number(payload.total ?? 0),
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.lastVisible : undefined
    },
    enabled: !!user?.uid && !authLoading,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,    // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Ne pas retry si c'est une erreur d'authentification
      if (error.message?.includes('authentification') || error.message?.includes('permission')) {
        return false
      }
      // Ne pas retry si l'auth est en erreur
      if (authError) {
        return false
      }
      return failureCount < 3
    },
    initialPageParam: undefined
  })
}

/**
 * Hook pour récupérer les statistiques des transactions
 */
export function useCreditTransactionStats() {
  const { user, isLoading: authLoading, isFirebaseConnected, error: authError } = useCurrentUser()

  return useQuery({
    queryKey: ['credit-transaction-stats', user?.uid],
    queryFn: async () => {
      if (!user?.uid) {
        throw new Error('Utilisateur non authentifié')
      }

      return await getCreditTransactionStats(user.uid)
    },
    enabled: !!user?.uid && isFirebaseConnected && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error.message?.includes('authentification') || error.message?.includes('permission')) {
        return false
      }
      if (authError) {
        return false
      }
      return failureCount < 3
    }
  })
}
