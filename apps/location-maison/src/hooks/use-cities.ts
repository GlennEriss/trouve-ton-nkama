import { useQuery, queryOptions } from '@tanstack/react-query';
import { City } from '@/models/city';

/**
 * Custom hook to get cities by province from Firestore with Redis caching.
 * @param {string | undefined} provinceId - The province ID to get cities for.
 * @returns {object} - React Query response containing the list of cities.
 */
export function useCities(provinceId: string | undefined) {
  return useQuery(queryOptions({
    queryKey: ['cities', provinceId],
    queryFn: async () => {
      if (!provinceId) throw new Error('Province ID is required to fetch cities.');
      const response = await fetch(`/api/location/cities?provinceId=${provinceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cities');
      }
      const data = await response.json();
      return data.cities as City[];
    },
    enabled: !!provinceId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  }));
}
