import { queryOptions, useQuery } from '@tanstack/react-query';

export type PropertyCountSummary = {
  byType: Record<string, number>;
  byProvince: Record<string, number>;
  generatedAt: string;
};

function isValidCountSummary(payload: unknown): payload is PropertyCountSummary {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as PropertyCountSummary;
  return (
    typeof data.generatedAt === 'string' &&
    !!data.byType &&
    typeof data.byType === 'object' &&
    !!data.byProvince &&
    typeof data.byProvince === 'object'
  );
}

export function useServerPropertyCountSummary() {
  return useQuery(
    queryOptions({
      queryKey: ['propertyCountSummary'],
      queryFn: async () => {
        const response = await fetch('/api/property/count/summary');
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ?? 'Failed to fetch property count summary',
          );
        }

        if (!isValidCountSummary(payload)) {
          throw new Error('Invalid property count summary payload');
        }

        return payload;
      },
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: true,
      retry: 1,
    }),
  );
}
