'use client'
import { useConfigure, useSearchBox } from 'react-instantsearch';
import { useSearchParams } from 'next/navigation';
import React from 'react'

function splitParamValues(value: string) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function escapeAlgoliaFilterValue(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFacetFilter(attribute: string, rawValue: string) {
    const values = splitParamValues(rawValue);

    if (values.length === 0) {
        return null;
    }

    const filters = values.map((value) => `${attribute}:"${escapeAlgoliaFilterValue(value)}"`);

    return filters.length === 1 ? filters[0] : `(${filters.join(' OR ')})`;
}

export default function FilterProviders({ children }: Readonly<{ children: React.ReactNode }>) {
    const searchParams = useSearchParams();

    // Recherche texte
    const { refine: refineQuery } = useSearchBox();
    const queryVal = searchParams.get("query") ?? "";
    React.useEffect(() => {
        refineQuery(queryVal);
    }, [queryVal, refineQuery]);

    // Filtres
    const filtersString = React.useMemo(() => {
        const f: string[] = [];
        
        // Filtre constant pour ne récupérer que les propriétés en cours et approuvées
        f.push(`state:"IN_PROGRESS"`);
        f.push(`moderationStatus:"APPROVED"`);
        
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
        const statusRaw = searchParams.get("status") ?? "";
        const tagsRaw = searchParams.get("tags") ?? "";

        const cityFilter = buildFacetFilter('city', cityVal);
        const streetFilter = buildFacetFilter('street', streetVal);
        const provinceFilter = buildFacetFilter('province', provinceVal);
        const typePropertyFilter = buildFacetFilter('typeProperty', typePropRaw);
        const statusFilter = buildFacetFilter('status', statusRaw);
        const tagsFilter = buildFacetFilter('tags', tagsRaw);

        if (cityFilter) f.push(cityFilter);
        if (streetFilter) f.push(streetFilter);
        if (provinceFilter) f.push(provinceFilter);
        if (minPriceVal) f.push(`price >= ${minPriceVal}`);
        if (maxPriceVal) f.push(`price <= ${maxPriceVal}`);
        if (minAreaVal) f.push(`area >= ${minAreaVal}`);
        if (maxAreaVal) f.push(`area <= ${maxAreaVal}`);
        if (minRoomsVal) f.push(`nbrRooms >= ${minRoomsVal}`);
        if (maxRoomsVal) f.push(`nbrRooms <= ${maxRoomsVal}`);
        if (typePropertyFilter) f.push(typePropertyFilter);
        if (statusFilter) f.push(statusFilter);
        if (tagsFilter) f.push(tagsFilter);
        return f.join(" AND ");
    }, [searchParams.toString()]);
    useConfigure({ filters: filtersString });
    return (
        <div>
            {children}
        </div>
    )
}
