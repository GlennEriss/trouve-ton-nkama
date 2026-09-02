'use client';
import { useQuery } from '@tanstack/react-query';
import { algoliaClient, ALGOLIA_INDEX_NAME, ALGOLIA_BASE_FILTER } from '@/lib/algolia';

export type LocationOption = { label: string; value: string };

async function fetchLocationFacet(attribute: string, extraFilter?: string): Promise<LocationOption[]> {
    const filters = extraFilter
        ? `${ALGOLIA_BASE_FILTER} AND ${extraFilter}`
        : ALGOLIA_BASE_FILTER;

    try {
        const response = await algoliaClient.search({
            requests: [{
                indexName: ALGOLIA_INDEX_NAME,
                query: '',
                facets: [attribute],
                filters,
                hitsPerPage: 0,
                attributesToRetrieve: [],
                attributesToHighlight: [],
            }]
        }) as any;

        const facets: Record<string, number> = response.results?.[0]?.facets?.[attribute] ?? {};

        return Object.keys(facets)
            .filter(Boolean)
            .map(name => ({ label: name, value: name }))
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    } catch {
        return [];
    }
}

export function useAlgoliaProvinceOptions() {
    return useQuery({
        queryKey: ['algolia-facets', 'province'],
        queryFn: () => fetchLocationFacet('province'),
        staleTime: 5 * 60 * 1000,
    });
}

export function useAlgoliaCityOptions(province: string | undefined) {
    return useQuery({
        queryKey: ['algolia-facets', 'city', province],
        queryFn: () => fetchLocationFacet('city', `province:"${province}"`),
        enabled: !!province,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Villes toutes provinces confondues, sans filtre province — pour la catégorie Mode. Une
 * annonce Mode a `province` codée en dur à la création (voir
 * category-listing/create/page.tsx, toujours GABON_PROVINCES[0]) : la cascade
 * Province -> Ville habituelle (useAlgoliaCityOptions, ci-dessus) bloquerait alors le
 * sélecteur Ville en attente d'une Province qui ne reflète jamais la vraie localisation du
 * vendeur. Utilisé par SelectCityModeScope.
 */
export function useAlgoliaAllCityOptions() {
    return useQuery({
        queryKey: ['algolia-facets', 'city', 'all'],
        queryFn: () => fetchLocationFacet('city'),
        staleTime: 5 * 60 * 1000,
    });
}

export function useAlgoliaStreetOptions(province: string | undefined, city: string | undefined) {
    return useQuery({
        queryKey: ['algolia-facets', 'street', province, city],
        queryFn: () => fetchLocationFacet('street', `province:"${province}" AND city:"${city}"`),
        enabled: !!city,
        staleTime: 5 * 60 * 1000,
    });
}
