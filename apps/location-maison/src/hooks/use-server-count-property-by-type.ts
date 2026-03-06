import { useQuery, queryOptions } from '@tanstack/react-query';

/**
 * Custom hook to get the count of properties by type from Firestore.
 * @param {string | undefined} type - The type of the property to count.
 * @returns {object} - React Query response containing the count of properties.
 */
export function useServerCountByPropertyType(type: string | undefined) {
  return useQuery(queryOptions({
    queryKey: ['propertyCountByType', type],
    queryFn: async () => {
      if (!type) throw new Error('Property type is required to fetch the count.');
      const response = await fetch(`/api/property/count/by-type?type=${type}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to fetch property count by type.');
      }

      if (typeof data?.count !== 'number') {
        throw new Error('Invalid property count response.');
      }

      return data.count;
    },
    enabled: !!type,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
  }));
}
