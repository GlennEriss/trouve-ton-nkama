'use client'

import React from 'react'
import Form from 'next/form'
import Link from 'next/link'
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '../ui/input';
import { FilterModalHomePage } from '../home-page/FilterModalHomePage';
import { useAlgoliaContext } from '@/providers/AlgoliaContext';
import { useInfiniteHits, useInstantSearch, useStats } from 'react-instantsearch';
import PropertyCard from '../home-page/PropertyCard';
import { useSearchParams } from 'next/navigation';
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';
import { useSession } from 'next-auth/react';
import SearchWithAIAccessNoticeDialog from './SearchWithAIAccessNoticeDialog';
import { useTrackSearchAnalytics } from '@/features/analytics/search/hooks/useTrackSearchAnalytics';
import InlineAdUnit from '@/components/ads/InlineAdUnit';
import { ADSENSE_SLOTS } from '@/lib/ads/config';

export default function SearchMobilePage() {
    const { trackEvent } = useTrackEvent()
    const { status } = useSession();
    const isAuthenticated = status === 'authenticated';
    const { searchText, setSearchText, province, city, street, minPrice, maxPrice, minArea, maxArea, minNbrRooms, maxNbrRooms, typeProperty, tags, setProvince, setCity, setStreet, setMinPrice, setMaxPrice, setMinArea, setMaxArea, setMinNbrRooms, setMaxNbrRooms, setTypeProperty, setStatus, setTags } = useAlgoliaContext()
    const topRef = React.useRef<HTMLDivElement>(null);
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const { items, isLastPage, showMore } = useInfiniteHits();
    const { nbHits } = useStats();
    const { status: searchStatus } = useInstantSearch();
    const searchParams = useSearchParams();
    const searchWithAIHref = React.useMemo(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('entry', 'search_cta');
        return `/search-with-ia?${params.toString()}`;
    }, [searchParams]);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [lastItemsCount, setLastItemsCount] = React.useState(0);
    const [newItemsLoaded, setNewItemsLoaded] = React.useState(0);
    const [isAccessDialogOpen, setIsAccessDialogOpen] = React.useState(false);

    useTrackSearchAnalytics({
        searchParams,
        nbHits,
        searchStatus,
    });

    const onSearchWithAIClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        trackEvent(trackingEvents.CTA_SEARCH_WITH_IA_ENTRY_CLICK, {
            source: 'search_mobile_page',
            is_authenticated: isAuthenticated ? 1 : 0,
        });

        if (!isAuthenticated) {
            event.preventDefault();
            setIsAccessDialogOpen(true);
        }
    };

    // Synchronisation URL → Contexte Algolia au chargement initial
    React.useEffect(() => {
        const queryVal = searchParams.get("query") ?? "";
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
        const tagsRaw = searchParams.get("tags");

        // Mettre à jour le contexte Algolia avec délai pour s'assurer de la stabilité
        setTimeout(() => {
            setSearchText(queryVal);
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
            setTags(tagsRaw ? tagsRaw.split(",").map(s => s.trim()) : []);
        }, 50);
    }, [searchParams.toString(), setSearchText, setProvince, setCity, setStreet, setMinPrice, setMaxPrice, setMinArea, setMaxArea, setMinNbrRooms, setMaxNbrRooms, setTypeProperty, setStatus, setTags]);

    const requestMore = React.useCallback(() => {
        if (isLastPage || isLoadingMore) return;
        setLastItemsCount(items.length);
        setIsLoadingMore(true);
        showMore();
    }, [isLastPage, isLoadingMore, items.length, showMore]);

    // Infinite hits + intersection observer
    React.useEffect(() => {
        if (!sentinelRef.current) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isLastPage && !isLoadingMore) {
                    requestMore();
                }
            },
            { rootMargin: "200px" }
        );
        obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }, [sentinelRef, isLastPage, isLoadingMore, requestMore]);

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
        const FIRST_AD_AFTER_INDEX = 4;
        const AD_INTERVAL = 8;

        const results: Array<
            | { type: 'property'; item: any }
            | { type: 'ad'; key: string }
        > = [];

        items.forEach((item, index) => {
            results.push({ type: 'property', item });

            const hasEnoughItems = items.length > FIRST_AD_AFTER_INDEX;
            if (!hasEnoughItems) return;

            const isFirstAdPosition = index === FIRST_AD_AFTER_INDEX;
            const isRecurringPosition =
                index > FIRST_AD_AFTER_INDEX &&
                (index - FIRST_AD_AFTER_INDEX) % AD_INTERVAL === 0;

            if (isFirstAdPosition || isRecurringPosition) {
                results.push({ type: 'ad', key: `mobile-${index}` });
            }
        });

        return results;
    }, [items]);

    // Scroll handlers
    const scrollToTop = () => {
        topRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    const scrollToBottom = () => {
        sentinelRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <>
            <div className='p-5 space-y-5 h-full pb-20' ref={topRef}>
                {/* Barre de recherche identique à la homepage */}
                <section className='space-y-4'>
                    <div className='space-y-1'>
                        <h1 className='text-gray-500 text-[11px]'>Votre futur chez-vous grâce à Trouve Ton Nkama</h1>
                        <div className='flex text-xl font-bold text-[#146B67] items-center gap-2'>
                            <h1>
                                Rechercher sur Trouve Ton Nkama
                            </h1>
                        </div>
                    </div>
                    <Form action="/search">
                        <div className="flex items-center border rounded-full p-2 px-4 bg-gray-100 focus-within:border-[#1FA89B]">
                            <button
                                type='submit'
                                onClick={(e) => {
                                    e.preventDefault();
                                    // Construire l'URL avec tous les filtres actifs
                                    const params = new URLSearchParams();
                                    if (searchText) params.append("query", searchText);
                                    if (province) params.append("province", province);
                                    if (city) params.append("city", city);
                                    if (street) params.append("street", street);
                                    if (minPrice) params.append("minPrice", minPrice);
                                    if (maxPrice) params.append("maxPrice", maxPrice);
                                    if (minArea) params.append("minArea", minArea);
                                    if (maxArea) params.append("maxArea", maxArea);
                                    if (minNbrRooms) params.append("minNbrRooms", minNbrRooms);
                                    if (maxNbrRooms) params.append("maxNbrRooms", maxNbrRooms);
                                    if (typeProperty && typeProperty.length > 0) {
                                        params.append("typeProperty", typeProperty.join(","));
                                    }
                                    if (tags && tags.length > 0) {
                                        params.append("tags", tags.join(","));
                                    }
                                    trackEvent(trackingEvents.CTA_SEARCH_SUBMIT_CLICK, {
                                        source: 'search_mobile_page',
                                        has_query: searchText ? 1 : 0,
                                        has_filters:
                                            province || city || street || minPrice || maxPrice || minArea || maxArea || minNbrRooms || maxNbrRooms
                                                ? 1
                                                : 0,
                                    });
                                    window.location.href = `/search?${params.toString()}`;
                                }}
                            >
                                <Search size={25} className='hover:stroke-[#1FA89B]' />
                            </button>
                            <Input
                                className='border-none bg-transparent shadow-none focus-visible:ring-0'
                                placeholder='Logement, ville, quartier...'
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                name="query"
                            />
                            <div>
                                <FilterModalHomePage />
                            </div>
                        </div>
                    </Form>
                    <Link
                        href={searchWithAIHref}
                        onClick={onSearchWithAIClick}
                        className="inline-flex items-center gap-2 rounded-full border border-[#146B67]/30 bg-[#E6F8F5] text-[#146B67] px-4 py-2 text-sm font-medium hover:bg-[#d8f1ed] transition-colors"
                    >
                        Rechercher avec IA
                    </Link>
                </section>

                <section className='space-y-5'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <h1 className='text-2xl font-bold text-[#146B67]'>
                                Résultats de la recherche
                            </h1>
                            <p className='text-sm text-gray-500'>
                                {nbHits} résultats trouvés
                            </p>
                        </div>
                        <div className='flex items-center gap-2'>
                            <button
                                type='button'
                                className='hidden md:flex items-center gap-2'
                            >
                                <FilterModalHomePage />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {items.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">Aucun résultat trouvé</p>
                            </div>
                        ) : (
                            <>
                                {/* Grille de résultats */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-fr">
                                    {feedItems.map((entry) =>
                                        entry.type === 'property' ? (
                                            <div
                                                key={entry.item.objectID}
                                                className="h-full animate-fade-in-up transition-all duration-300"
                                            >
                                                <PropertyCard property={entry.item} />
                                            </div>
                                        ) : (
                                            <InlineAdUnit
                                                key={`ad-${entry.key}`}
                                                className="sm:col-span-2 lg:col-span-5 xl:col-span-6"
                                                slot={ADSENSE_SLOTS.searchInline}
                                                slotKey={`search-mobile-${entry.key}`}
                                                compact
                                            />
                                        )
                                    )}
                                </div>

                                {/* Sentinel pour infinite scroll */}
                                <div ref={sentinelRef} />

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
                                        <span className="text-xs text-[#146B67] bg-[#E6F8F5] border border-[#B8ECE4] rounded-full px-3 py-1 animate-fade-in-up">
                                            +{newItemsLoaded} nouvelles annonces ajoutées
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Boutons de scroll haut/bas */}
                    <div className="fixed bottom-24 right-6 flex flex-col gap-2 z-50">
                        <button
                            onClick={scrollToTop}
                            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            aria-label="Aller en haut"
                        >
                            <ChevronUp size={20} />
                        </button>
                        <button
                            onClick={scrollToBottom}
                            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            aria-label="Aller en bas"
                        >
                            <ChevronDown size={20} />
                        </button>
                    </div>
                </section>
            </div>
            <SearchWithAIAccessNoticeDialog
                open={isAccessDialogOpen}
                onOpenChange={setIsAccessDialogOpen}
            />
        </>
    );
}
