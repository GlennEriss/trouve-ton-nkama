'use client'
import { useConfigure, useSearchBox } from 'react-instantsearch';
import { useSearchParams } from 'next/navigation';
import React from 'react'
import { buildPublicSearchFilters } from '@/lib/search/search-filter-query';

export default function FilterProviders({ children }: Readonly<{ children: React.ReactNode }>) {
    const searchParams = useSearchParams();

    // Recherche texte
    const { refine: refineQuery } = useSearchBox();
    const queryVal = searchParams.get("query") ?? "";
    React.useEffect(() => {
        refineQuery(queryVal);
    }, [queryVal, refineQuery]);

    // Filtres
    const serializedSearchParams = searchParams.toString();
    const filtersString = React.useMemo(
        () => buildPublicSearchFilters(new URLSearchParams(serializedSearchParams)),
        [serializedSearchParams],
    );
    useConfigure({ filters: filtersString });
    return (
        <div>
            {children}
        </div>
    )
}
