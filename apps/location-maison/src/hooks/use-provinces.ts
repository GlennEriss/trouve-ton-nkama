import { useQuery, queryOptions } from '@tanstack/react-query';
import { Province } from '@/models/province';

/**
 * Custom hook to get all provinces from Firestore with Redis caching.
 * @returns {object} - React Query response containing the list of provinces.
 */
export function useProvinces() {
  return useQuery(queryOptions({
    queryKey: ['provinces'],
    queryFn: async () => {
      const response = await fetch('/api/location/provinces');
      if (!response.ok) {
        throw new Error('Failed to fetch provinces');
      }
      const data = await response.json();
      return data.provinces as Province[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  }));
}
