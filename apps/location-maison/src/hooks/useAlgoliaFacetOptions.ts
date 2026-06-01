'use client';
import { useQuery } from '@tanstack/react-query';
import { algoliaClient, ALGOLIA_INDEX_NAME, ALGOLIA_BASE_FILTER } from '@/lib/algolia';
import { TypeProperty } from '@/constantes/property-type';

export type FacetOption = { label: string; value: string; count: number };

async function fetchPropertyFacet(attribute: string): Promise<Record<string, number>> {
    try {
        const response = await algoliaClient.search({
            requests: [{
                indexName: ALGOLIA_INDEX_NAME,
                query: '',
                facets: [attribute],
                filters: ALGOLIA_BASE_FILTER,
                hitsPerPage: 0,
                attributesToRetrieve: [],
                attributesToHighlight: [],
            }]
        }) as any;
        return response.results?.[0]?.facets?.[attribute] ?? {};
    } catch {
        return {};
    }
}

export function useAlgoliaTypePropertyOptions(): { options: FacetOption[]; isLoading: boolean } {
    const { data = {}, isLoading } = useQuery({
        queryKey: ['algolia-facets', 'typeProperty'],
        queryFn: () => fetchPropertyFacet('typeProperty'),
        staleTime: 5 * 60 * 1000,
    });

    const options: FacetOption[] = Object.entries(data)
        .map(([value, count]) => ({
            label: TypeProperty[value] ?? value,
            value,
            count,
        }))
        .filter(o => o.label)
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

    return { options, isLoading };
}

export function useAlgoliaTagOptions(): { options: FacetOption[]; isLoading: boolean } {
    const { data = {}, isLoading } = useQuery({
        queryKey: ['algolia-facets', 'tags'],
        queryFn: () => fetchPropertyFacet('tags'),
        staleTime: 5 * 60 * 1000,
    });

    const options: FacetOption[] = Object.entries(data)
        .map(([value, count]) => ({
            label: value,
            value,
            count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

    return { options, isLoading };
}
