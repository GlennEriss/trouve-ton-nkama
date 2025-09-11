'use client'

import React from 'react'
import { useProvinces } from '@/hooks/use-location-exports'
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { useInfiniteHits, useStats } from 'react-instantsearch'
import Image from 'next/image'
import PropertyCard from '../home-page/PropertyCard'
import { useSearchParams } from 'next/navigation'
import FilterSearchDesktopPageSection from './FilterSearchDesktopPageSection'

export default function 
SearchDesktopPage() {
    const { items, isLastPage, showMore } = useInfiniteHits();
    const { nbHits } = useStats();
    const searchParams = useSearchParams();

    const {
        setProvince,
        setCity,
        setStreet,
        setMinPrice,
        setMaxPrice,
        setMinArea,
        setMaxArea,
        setMinNbrRooms,
        setMaxNbrRooms,
        setTypeProperty,
        setStatus,
        setTags,
        clearFilters,
    } = useAlgoliaContext();

    // Hooks pour récupérer les données de localisation
    const { data: provinces = [] } = useProvinces();
    // Synchronisation URL → Contexte Algolia au chargement initial
    React.useEffect(() => {
        // Attendre que les données provinces soient chargées avant la synchronisation
        if (!provinces.length) return;

        const provinceVal = searchParams.get("province") ?? "";
        const cityVal = searchParams.get("city") ?? "";
        const streetVal = searchParams.get("street") ?? "";
        const minPriceVal = searchParams.get("minPrice") ?? "";
        const maxPriceVal = searchParams.get("maxPrice") ?? "";
        const minAreaVal = searchParams.get("minArea") ?? "";
        const maxAreaVal = searchParams.get("maxArea") ?? "";
        const minRoomsVal = searchParams.get("minNbrRooms") ?? "";
        const maxRoomsVal = searchParams.get("maxNbrRooms") ?? "";
        const typePropRaw = searchParams.get("typeProperty");
        const statusRaw = searchParams.get("status");
        const tagsRaw = searchParams.get("tags");

        // Mettre à jour le contexte Algolia
        setProvince(provinceVal);
        setCity(cityVal);
        setStreet(streetVal);
        setMinPrice(minPriceVal);
        setMaxPrice(maxPriceVal);
        setMinArea(minAreaVal);
        setMaxArea(maxAreaVal);
        setMinNbrRooms(minRoomsVal);
        setMaxNbrRooms(maxRoomsVal);
        setTypeProperty(typePropRaw ? typePropRaw.split(",").map(s => s.trim()) : []);
        setStatus(statusRaw ? statusRaw.split(",").map(s => s.trim()) : []);
        setTags(tagsRaw ? tagsRaw.split(",").map(s => s.trim()) : []);
    }, [searchParams.toString(), provinces, setProvince, setCity, setStreet, setMinPrice, setMaxPrice, setMinArea, setMaxArea, setMinNbrRooms, setMaxNbrRooms, setTypeProperty, setTags]);
    return (
        <>
            <div className='flex p-5'>
                <FilterSearchDesktopPageSection />
                <div className="w-3/4 flex flex-col h-screen pb-20">
                    <div className="p-5 flex-1 overflow-auto">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-xl p-8">
                                <Image
                                    src="/no-favorites.svg"
                                    alt="Aucun résultat trouvé"
                                    width={240}
                                    height={240}
                                    className="opacity-70"
                                />
                                <p className="mt-6 text-gray-600 dark:text-gray-400 text-lg text-center">
                                    Aucun bien ne correspond à ces critères.
                                </p>
                                <button
                                    onClick={clearFilters}
                                    className="mt-6 px-6 py-2.5 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-full hover:brightness-110 transition-all duration-300 shadow-md hover:shadow-lg"
                                >
                                    Réinitialiser les filtres
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                        {nbHits} {nbHits > 1 ? 'annonces trouvées' : 'annonce trouvée'}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                                    {items.map((propertyData, i) => (
                                        <div
                                            key={propertyData.objectID}
                                            className="transform transition-all duration-300 hover:translate-y-[-4px]"
                                        >
                                            <PropertyCard
                                                property={propertyData}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {!isLastPage && items.length > 0 && (
                        <div className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900">
                            <div className="flex justify-center">
                                <button
                                    onClick={showMore}
                                    className="px-8 py-3 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-full font-medium hover:brightness-110 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    <span>Voir plus d'annonces</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
