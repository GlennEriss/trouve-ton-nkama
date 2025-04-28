import { useQuery, queryOptions } from '@tanstack/react-query'
import { getPropertyById } from '@/db/property.db'

export function useProperty(id: string | undefined) {
  return useQuery(queryOptions({
    queryKey: ['property', id],
    queryFn: () => {
      if (!id) throw new Error('ID is required to fetch the property.')
      return getPropertyById(id)
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  }))
}