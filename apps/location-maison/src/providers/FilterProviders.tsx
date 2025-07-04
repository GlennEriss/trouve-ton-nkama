'use client'
import { useConfigure, useSearchBox } from 'react-instantsearch';
import { useSearchParams } from 'next/navigation';
import React from 'react'

export default function FilterProviders({ children }: Readonly<{ children: React.ReactNode }>) {
    const searchParams = useSearchParams();

    // Recherche texte
    const { refine: refineQuery } = useSearchBox();
    const queryVal = searchParams.get("query") ?? "";
    React.useEffect(() => {
        refineQuery(queryVal);
    }, [queryVal]);

    // Filtres
    const filtersString = React.useMemo(() => {
        const f: string[] = [];
        
        // Filtre constant pour ne récupérer que les propriétés en cours
        f.push(`state:"IN_PROGRESS"`);
        
        const cityVal = searchParams.get("city") ?? "";
        const streetVal = searchParams.get("street") ?? "";
        const provinceVal = searchParams.get("province") ?? "";
        const minPriceVal = searchParams.get("minPrice") ?? "";
        const maxPriceVal = searchParams.get("maxPrice") ?? "";
        const minAreaVal = searchParams.get("minArea") ?? "";
        const maxAreaVal = searchParams.get("maxArea") ?? "";
        const minRoomsVal = searchParams.get("minNbrRooms") ?? "";
        const maxRoomsVal = searchParams.get("maxNbrRooms") ?? "";
        const typePropRaw = searchParams.get("typeProperty") ?? "";
        const tagsRaw = searchParams.get("tags") ?? "";

        if (cityVal) f.push(`city:"${cityVal}"`);
        if (streetVal) f.push(`street:"${streetVal}"`);
        if (provinceVal) f.push(`province:"${provinceVal}"`);
        if (minPriceVal) f.push(`price >= ${minPriceVal}`);
        if (maxPriceVal) f.push(`price <= ${maxPriceVal}`);
        if (minAreaVal) f.push(`area >= ${minAreaVal}`);
        if (maxAreaVal) f.push(`area <= ${maxAreaVal}`);
        if (minRoomsVal) f.push(`nbrRooms >= ${minRoomsVal}`);
        if (maxRoomsVal) f.push(`nbrRooms <= ${maxRoomsVal}`);
        if (typePropRaw) {
            f.push(
                "(" +
                typePropRaw
                    .split(",")
                    .map((t) => `typeProperty:"${t.trim()}"`)
                    .join(" OR ") +
                ")"
            );
        }
        if (tagsRaw) {
            f.push(
                "(" +
                tagsRaw
                    .split(",")
                    .map((t) => `tags:"${t.trim()}"`)
                    .join(" OR ") +
                ")"
            );
        }
        return f.join(" AND ");
    }, [searchParams.toString()]);
    useConfigure({ filters: filtersString });
    return (
        <div>
            {children}
        </div>
    )
}
