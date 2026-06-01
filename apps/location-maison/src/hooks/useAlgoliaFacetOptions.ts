'use client';
import { useMemo } from 'react';
import { useRefinementList } from 'react-instantsearch';
import { TypeProperty } from '@/constantes/property-type';

export type FacetOption = { label: string; value: string; count: number };

export function useAlgoliaTypePropertyOptions(): { options: FacetOption[] } {
    const { items } = useRefinementList({
        attribute: 'typeProperty',
        operator: 'or',
        limit: 50,
        sortBy: ['name:asc'],
    });

    const options = useMemo(() =>
        items.map(item => ({
            label: TypeProperty[item.value] ?? item.value,
            value: item.value,
            count: item.count,
        })).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
        [items]
    );

    return { options };
}

export function useAlgoliaTagOptions(): { options: FacetOption[] } {
    const { items } = useRefinementList({
        attribute: 'tags',
        operator: 'or',
        limit: 100,
        sortBy: ['name:asc'],
    });

    const options = useMemo(() =>
        items.map(item => ({
            label: item.label,
            value: item.value,
            count: item.count,
        })).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
        [items]
    );

    return { options };
}
