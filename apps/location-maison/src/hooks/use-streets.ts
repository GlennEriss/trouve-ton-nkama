import { useQuery, queryOptions } from '@tanstack/react-query';
import { Street } from '@/models/street';

/**
 * Custom hook to get streets by city from Firestore with Redis caching.
 * @param {string | undefined} cityId - The city ID to get streets for.
 * @returns {object} - React Query response containing the list of streets.
 */
export function useStreets(cityId: string | undefined) {
  return useQuery(queryOptions({
    queryKey: ['streets', cityId],
    queryFn: async () => {
      if (!cityId) throw new Error('City ID is required to fetch streets.');
      const response = await fetch(`/api/location/streets?cityId=${cityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch streets');
      }
      const data = await response.json();
      return data.streets as Street[];
    },
    enabled: !!cityId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  }));
}
