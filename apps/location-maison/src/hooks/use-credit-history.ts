/**
 * Hook pour récupérer l'historique des transactions de crédits avec pagination
 */

'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/use-current-user'
import { 
  getCreditHistoryByUserId, 
  getCreditTransactionStats,
  GetHistoryOptions 
} from '@/db/credit-transaction.db'

interface HistoryFilters {
  type?: 'all' | 'purchase' | 'spend'
  limit?: number
}

export function useCreditHistory(filters: HistoryFilters = {}) {
  const { user, isLoading: authLoading, isFirebaseConnected, error: authError } = useCurrentUser()

  return useInfiniteQuery({
    queryKey: ['credit-history', user?.uid, filters.type],
    queryFn: async ({ pageParam }) => {
      if (!user?.uid) {
        throw new Error('Utilisateur non authentifié')
      }

      const options: GetHistoryOptions = {
        type: filters.type,
        limit: filters.limit || 10
      }

      if (pageParam) {
        options.startAfter = pageParam
      }

      return await getCreditHistoryByUserId(user.uid, options)
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.lastVisible : undefined
    },
    enabled: !!user?.uid && isFirebaseConnected && !authLoading,
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
