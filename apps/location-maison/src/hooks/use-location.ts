import { queryOptions, useQuery } from "@tanstack/react-query";

export function useLocation() {
    return useQuery(queryOptions({
        queryKey: ['locations'],
        queryFn: async () => {
            const res = await fetch('/api/location');
            const data = await res.json();
            if (res.status !== 200) {
                throw new Error(data.error ?? 'Failed to fetch property');
            }
            return data;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
        gcTime: 1000 * 60 * 15, // 15 minutes
        refetchOnWindowFocus: false,
    }));
}