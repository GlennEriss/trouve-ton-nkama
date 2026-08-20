'use client';
import { useQuery } from '@tanstack/react-query';
import { algoliaClient, ALGOLIA_INDEX_NAME, ALGOLIA_BASE_FILTER } from '@/lib/algolia';
import { TypeProperty } from '@/constantes/property-type';

export type FacetOption = { label: string; value: string; count: number };

// `extraFilters` scope la requête au-delà du filtre de base (ex. categoryId:"<id>") —
// nécessaire pour les attributs Mode dont les valeurs n'ont de sens que dans une feuille
// donnée (une "Marque" agrégée toutes feuilles confondues aurait des comptages incohérents).
async function fetchAlgoliaFacet(attribute: string, extraFilters?: string): Promise<Record<string, number>> {
    try {
        const filters = extraFilters ? `${ALGOLIA_BASE_FILTER} AND ${extraFilters}` : ALGOLIA_BASE_FILTER;
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
        return response.results?.[0]?.facets?.[attribute] ?? {};
    } catch {
        return {};
    }
}

export function useAlgoliaTypePropertyOptions(): { options: FacetOption[]; isLoading: boolean } {
    const { data = {}, isLoading } = useQuery({
        queryKey: ['algolia-facets', 'typeProperty'],
        queryFn: () => fetchAlgoliaFacet('typeProperty'),
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
        queryFn: () => fetchAlgoliaFacet('tags'),
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

// Filtre d'attribut dynamique par catégorie (Mode, etc.) : `attributeKey` correspond à une
// clé de `attributeSchema` (ex. "taille", "marque"), traduite en attribut Algolia
// `attributes.<key>` — voir search-filter-query.ts pour la même convention côté filtre
// appliqué. Scopé par `categoryId` : sans lui, les options remonteraient toutes feuilles
// confondues (ex. tailles vêtements mélangées aux pointures chaussures).
export function useAlgoliaCategoryAttributeOptions(
    attributeKey: string,
    categoryId: string | null | undefined,
): { options: FacetOption[]; isLoading: boolean } {
    const attribute = `attributes.${attributeKey}`;
    const { data = {}, isLoading } = useQuery({
        queryKey: ['algolia-facets', 'category-attribute', categoryId, attributeKey],
        queryFn: () => fetchAlgoliaFacet(attribute, `categoryId:"${categoryId}"`),
        staleTime: 5 * 60 * 1000,
        enabled: Boolean(categoryId && attributeKey),
    });

    const options: FacetOption[] = Object.entries(data)
        .map(([value, count]) => ({ label: value, value, count }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

    return { options, isLoading };
}
