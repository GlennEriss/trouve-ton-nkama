'use client'

import React from 'react'
import { useProvinces } from '@/hooks/use-location-exports'
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { useInfiniteHits, useInstantSearch, useStats } from 'react-instantsearch'
import { LoaderCircle } from 'lucide-react'
import Image from 'next/image'
import PropertyCard from '../home-page/PropertyCard'
import { useSearchParams } from 'next/navigation'
import FilterSearchDesktopPageSection from './FilterSearchDesktopPageSection'
import { useTrackSearchAnalytics } from '@/features/analytics/search/hooks/useTrackSearchAnalytics';
import SponsoredSlot from '@/components/ads/SponsoredSlot';
import { ADSENSE_SLOTS } from '@/lib/ads/config';

export default function 
SearchDesktopPage() {
    const { items, isLastPage, showMore } = useInfiniteHits();
    const { nbHits } = useStats();
    const { status: searchStatus, refresh } = useInstantSearch();
    const searchParams = useSearchParams();
    const resultsContainerRef = React.useRef<HTMLDivElement>(null);
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [lastItemsCount, setLastItemsCount] = React.useState(0);
    const [newItemsLoaded, setNewItemsLoaded] = React.useState(0);

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

    useTrackSearchAnalytics({
        searchParams,
        nbHits,
        searchStatus,
    });

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
    }, [searchParams.toString(), provinces, setProvince, setCity, setStreet, setMinPrice, setMaxPrice, setMinArea, setMaxArea, setMinNbrRooms, setMaxNbrRooms, setTypeProperty, setStatus, setTags]);

    const requestMore = React.useCallback(() => {
        if (isLastPage || isLoadingMore) return;
        setLastItemsCount(items.length);
        setIsLoadingMore(true);
        showMore();
    }, [isLastPage, isLoadingMore, items.length, showMore]);

    React.useEffect(() => {
        if (!sentinelRef.current || !resultsContainerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isLastPage && !isLoadingMore) {
                    requestMore();
                }
            },
            {
                root: resultsContainerRef.current,
                rootMargin: '220px',
                threshold: 0.01,
            },
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [isLastPage, isLoadingMore, requestMore]);

    React.useEffect(() => {
        if (!isLoadingMore) return;

        if (items.length > lastItemsCount) {
            const delta = items.length - lastItemsCount;
            setNewItemsLoaded(delta);
            setIsLoadingMore(false);

            const timeoutId = window.setTimeout(() => setNewItemsLoaded(0), 1800);
            return () => window.clearTimeout(timeoutId);
        }

        const guardTimeout = window.setTimeout(() => {
            setIsLoadingMore(false);
        }, 5000);

        return () => window.clearTimeout(guardTimeout);
    }, [items, isLoadingMore, lastItemsCount]);

    const feedItems = React.useMemo(() => {
        const FIRST_AD_AFTER_INDEX = 7;
        const AD_INTERVAL = 12;

        const results: Array<
            | { type: 'property'; item: any }
            | { type: 'ad'; key: string; adIndex: number }
        > = [];

        let adIndex = 0;
        items.forEach((item, index) => {
            results.push({ type: 'property', item });

            const hasEnoughItems = items.length > FIRST_AD_AFTER_INDEX;
            if (!hasEnoughItems) return;

            const isFirstAdPosition = index === FIRST_AD_AFTER_INDEX;
            const isRecurringPosition =
                index > FIRST_AD_AFTER_INDEX &&
                (index - FIRST_AD_AFTER_INDEX) % AD_INTERVAL === 0;

            if (isFirstAdPosition || isRecurringPosition) {
                results.push({ type: 'ad', key: `desktop-${index}`, adIndex: adIndex++ });
            }
        });

        return results;
    }, [items]);

    return (
        <>
            <div className='flex p-5'>
                <FilterSearchDesktopPageSection />
                <div className="w-3/4 flex flex-col h-screen pb-20">
                    <div ref={resultsContainerRef} className="p-5 flex-1 overflow-auto">
                        {searchStatus === 'error' ? (
                            <div className="flex h-full flex-col items-center justify-center bg-gray-50 p-8 text-center dark:bg-gray-800" role="alert">
                                <p className="text-lg text-gray-700 dark:text-gray-200">La recherche est momentanément indisponible.</p>
                                <button
                                    type="button"
                                    onClick={refresh}
                                    className="mt-6 min-h-11 rounded-full bg-primary px-6 py-2.5 text-white hover:bg-primary-800"
                                >
                                    Réessayer
                                </button>
                            </div>
                        ) : items.length === 0 && (searchStatus === 'loading' || searchStatus === 'stalled') ? (
                            <div className="flex h-full items-center justify-center gap-3 text-gray-600 dark:text-gray-300" role="status">
                                <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" />
                                <span>Recherche des annonces...</span>
                            </div>
                        ) : items.length === 0 ? (
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
                                    className="mt-6 min-h-11 rounded-full bg-primary px-6 py-2.5 text-white transition-colors hover:bg-primary-800"
                                >
                                    Réinitialiser les filtres
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                        {nbHits} {nbHits > 1 ? 'annonces trouvées' : 'annonce trouvée'}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                                    {feedItems.map((entry) =>
                                        entry.type === 'property' ? (
                                            <div
                                                key={entry.item.objectID}
                                                className="h-full animate-fade-in-up transform transition-all duration-300 hover:translate-y-[-4px]"
                                            >
                                                <PropertyCard property={entry.item} />
                                            </div>
                                        ) : (
                                            <SponsoredSlot
                                                key={`ad-${entry.key}`}
                                                placement="search_infeed"
                                                province={searchParams.get('province')}
                                                city={searchParams.get('city')}
                                                rotationIndex={entry.adIndex}
                                                className="h-full sm:col-span-2 xl:col-span-3"
                                                fallbackSlot={ADSENSE_SLOTS.searchInline}
                                                fallbackSlotKey={`search-desktop-${entry.key}`}
                                            />
                                        )
                                    )}
                                </div>

                                <div ref={sentinelRef} className="h-5" />

                                {!isLastPage && (
                                    <div className="py-4 text-center text-sm text-gray-500">
                                        {isLoadingMore ? (
                                            <span className="inline-flex items-center gap-2">
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                </svg>
                                                Chargement des annonces...
                                            </span>
                                        ) : (
                                            "Défilez vers le bas pour charger plus d'annonces"
                                        )}
                                    </div>
                                )}

                                {newItemsLoaded > 0 && (
                                    <div className="mb-5 text-center">
                                        <span className="text-xs text-primary bg-primary-100 border border-primary-100 rounded-full px-3 py-1 animate-fade-in-up">
                                            +{newItemsLoaded} nouvelles annonces ajoutées
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
