'use client'

import { useQuery } from '@tanstack/react-query'
import { getUserByUID } from '@/db/user.db'

export function useUserByUID(uid: string | undefined) {
  return useQuery({
    queryKey: ['user', uid],
    queryFn: () => {
      if (!uid) throw new Error('UID is required to fetch the user.')
      return getUserByUID(uid)
    },
    enabled: !!uid,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15,    // 15 minutes
    refetchOnWindowFocus: false,
  })
}