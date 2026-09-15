'use client'
import { useConfigure, usePagination, useSearchBox } from 'react-instantsearch';
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

    // Le widget Configure ci-dessus applique les nouveaux filtres via `helper.setState()`, qui
    // ne réinitialise JAMAIS `page` (contrairement à `helper.setQueryParameter()`) — le helper
    // Algolia sous-jacent vit dans le provider racine (providers.tsx) et survit donc à toute
    // navigation client (changement de section Immobilier -> Mode, filtre province/prix...).
    // Sans ce reset explicite, changer de section après avoir scrollé (InfiniteHits avance
    // `page`) renvoie une page qui n'existe pas pour la nouvelle section (ex: Mode, catalogue
    // plus petit) -> hits vides alors que nbHits > 0, et la page affiche "aucune annonce" à
    // tort tant qu'un rechargement complet ne remonte pas un nouveau helper à page 0. Constaté
    // en prod sur /search : bascule Immobilier -> Mode après scroll.
    const { refine: refinePage } = usePagination();
    const isFirstFiltersRender = React.useRef(true);
    React.useEffect(() => {
        if (isFirstFiltersRender.current) {
            isFirstFiltersRender.current = false;
            return;
        }
        refinePage(0);
    }, [filtersString, refinePage]);

    return (
        <div>
            {children}
        </div>
    )
}
