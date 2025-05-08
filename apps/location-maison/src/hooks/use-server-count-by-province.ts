import { useQuery, queryOptions } from '@tanstack/react-query';

/**
 * Custom hook to fetch the count of properties in a specific province.
 * @param {string} province - The name of the province to filter properties by.
 * @returns {object} - The result of the query including the count.
 */
export function useServerCountByProvince(province: string | undefined) {
  return useQuery(queryOptions({
    queryKey: ['propertyCount', province],
    queryFn: async () => {
      if (!province) throw new Error('Province is required to fetch property count.');
      const res = await fetch(`/api/property/count/by-province?province=${province}`);
      const data = await res.json();
      return data.count;
    },
    enabled: !!province,
    staleTime: 1000 * 60 * 10,  // Cache duration: 10 minutes
    gcTime: 1000 * 60 * 15,      // Garbage collection: 15 minutes
    refetchOnWindowFocus: false,
  }));
}