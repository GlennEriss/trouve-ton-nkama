import { useQuery, queryOptions } from '@tanstack/react-query';

export function useProperty(id: string | undefined) {
  return useQuery(queryOptions({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required to fetch the property.');
      const res = await fetch(`/api/property/id?id=${id}`);
      const data = await res.json();

      if (res.status !== 200) {
        throw new Error(data.error ?? 'Failed to fetch property');
      }
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
  }));
}