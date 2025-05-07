

import { useQuery, queryOptions } from '@tanstack/react-query';
import { getServerCountByPropertyType } from '@/db/property.db';

/**
 * Custom hook to get the count of properties by type from Firestore.
 * @param {string | undefined} type - The type of the property to count.
 * @returns {object} - React Query response containing the count of properties.
 */
export function useServerCountByPropertyType(type: string | undefined) {
  return useQuery(queryOptions({
    queryKey: ['propertyCountByType', type],
    queryFn: () => {
      if (!type) throw new Error('Property type is required to fetch the count.');
      return getServerCountByPropertyType(type);
    },
    enabled: !!type,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  }));
}