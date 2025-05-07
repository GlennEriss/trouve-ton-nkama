

import { useQuery, queryOptions } from '@tanstack/react-query';
import { getServerCountByProvince } from '@/db/property.db';

/**
 * Custom hook to fetch the count of properties in a specific province.
 * @param {string} province - The name of the province to filter properties by.
 * @returns {object} - The result of the query including the count.
 */
export function useServerCountByProvince(province: string | undefined) {
  return useQuery(queryOptions({
    queryKey: ['propertyCount', province],
    queryFn: () => {
      if (!province) throw new Error('Province is required to fetch property count.');
      return getServerCountByProvince(province);
    },
    enabled: !!province,
    staleTime: 1000 * 60 * 10,  // Cache duration: 10 minutes
    gcTime: 1000 * 60 * 15,      // Garbage collection: 15 minutes
    refetchOnWindowFocus: false,
  }));
}