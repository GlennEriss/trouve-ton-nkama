'use client'

import React from 'react'
import Form from 'next/form'
import Link from 'next/link'
import { Search, ChevronUp, ChevronDown, LoaderCircle } from 'lucide-react';
import { Input } from '@trouve-ton-nkama/ui/input';
import { FilterModalHomePage } from '../home-page/FilterModalHomePage';
import { useAlgoliaContext } from '@/providers/AlgoliaContext';
import { useInfiniteHits, useInstantSearch, useStats } from 'react-instantsearch';
import PropertyCard from '../home-page/PropertyCard';
import CategoryFilterPills from './CategoryFilterPills';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';
import { useSession } from 'next-auth/react';
import SearchWithAIAccessNoticeDialog from './SearchWithAIAccessNoticeDialog';
import { useTrackSearchAnalytics } from '@/features/analytics/search/hooks/useTrackSearchAnalytics';
import SponsoredSlot from '@/components/ads/SponsoredSlot';
import { ADSENSE_SLOTS } from '@/lib/ads/config';
import { buildSearchRequestPrefillUrl } from '@/lib/search-request-prefill';

export default function SearchMobilePage() {
    const { trackEvent } = useTrackEvent()
    const router = useRouter();
    const { status } = useSession();
    const isAuthenticated = status === 'authenticated';
    const { searchText, setSearchText, province, city, street, minPrice, maxPrice, minArea, maxArea, minNbrRooms, maxNbrRooms, typeProperty, tags, setProvince, setCity, setStreet, setMinPrice, setMaxPrice, setMinArea, setMaxArea, setMinNbrRooms, setMaxNbrRooms, setTypeProperty, setStatus, setTags } = useAlgoliaContext()
    const topRef = React.useRef<HTMLDivElement>(null);
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const { items, isLastPage, showMore } = useInfiniteHits();
    const { nbHits } = useStats();
    const { status: searchStatus, refresh } = useInstantSearch();
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
        const statusRaw = searchParams.get("status");
        const tagsRaw = searchParams.get("tags");

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
        setTypeProperty(typePropRaw ? typePropRaw.split(",").map(s => s.trim()).filter(Boolean) : []);
        setStatus(statusRaw ? statusRaw.split(",").map(s => s.trim()).filter(Boolean) : []);
        setTags(tagsRaw ? tagsRaw.split(",").map(s => s.trim()).filter(Boolean) : []);
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
            return;
        }

        const guardTimeout = window.setTimeout(() => {
            setIsLoadingMore(false);
        }, 5000);

        return () => window.clearTimeout(guardTimeout);
    }, [items, isLoadingMore, lastItemsCount]);

    React.useEffect(() => {
        if (newItemsLoaded <= 0) return;
        const timeoutId = window.setTimeout(() => setNewItemsLoaded(0), 1800);
        return () => window.clearTimeout(timeoutId);
    }, [newItemsLoaded]);

    const feedItems = React.useMemo(() => {
        const FIRST_AD_AFTER_INDEX = 5;
        const AD_INTERVAL = 10;

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
                results.push({ type: 'ad', key: `mobile-${index}`, adIndex: adIndex++ });
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
                        <p className='text-xs text-gray-600 dark:text-gray-300'>Votre futur chez-vous grâce à Trouve Ton Nkama</p>
                        <div className='flex text-xl font-bold text-primary items-center gap-2'>
                            <h1>
                                Rechercher sur Trouve Ton Nkama
                            </h1>
                        </div>
                    </div>
                    <Form action="/search">
                        <div className="flex items-center border rounded-full p-2 px-3 bg-gray-100 focus-within:border-secondary dark:border-gray-700 dark:bg-gray-800">
                            <button
                                type='submit'
                                aria-label='Lancer la recherche'
                                className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-700'
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
                                    router.push(`/search?${params.toString()}`);
                                }}
                            >
                                <Search size={25} className='hover:stroke-secondary' />
                            </button>
                            <Input
                                className='h-11 border-none bg-transparent shadow-none focus-visible:ring-0'
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
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/30 bg-primary-100 text-primary px-4 py-2 text-sm font-medium hover:bg-primary-100 transition-colors dark:border-secondary/50 dark:bg-primary-900 dark:text-primary-200"
                    >
                        Rechercher avec IA
                    </Link>
                </section>

                <section className='space-y-5'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <h1 className='text-2xl font-bold text-primary'>
                                Résultats de la recherche
                            </h1>
                            <p className='text-sm text-gray-600 dark:text-gray-300'>
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

                    <CategoryFilterPills />

                    <div className="space-y-4">
                        {searchStatus === 'error' ? (
                            <div className="text-center py-8" role="alert">
                                <p className="text-gray-700 dark:text-gray-200">La recherche est momentanément indisponible.</p>
                                <button
                                    type="button"
                                    onClick={refresh}
                                    className="mt-4 min-h-11 rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-800"
                                >
                                    Réessayer
                                </button>
                            </div>
                        ) : items.length === 0 && (searchStatus === 'loading' || searchStatus === 'stalled') ? (
                            <div className="flex items-center justify-center gap-2 py-8 text-gray-600 dark:text-gray-300" role="status">
                                <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                                <span>Recherche des annonces...</span>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-600 dark:text-gray-300">Aucun résultat trouvé</p>
                                <Link
                                    href={buildSearchRequestPrefillUrl(searchParams)}
                                    className="mt-4 inline-flex min-h-11 items-center rounded-full border border-secondary px-5 py-2 text-sm font-semibold text-secondary hover:bg-secondary/5"
                                >
                                    Publier ma recherche
                                </Link>
                            </div>
                        ) : (
                            <>
                                {/* Grille de résultats — flex-wrap plutôt qu'un nombre de colonnes fixe par
                                    breakpoint (2026-08-15, demande utilisateur explicite) : la card fait
                                    désormais une taille fixe (220px, même gabarit que le carrousel de la
                                    home), le nombre de cards par ligne s'adapte à la largeur disponible.
                                    Largeur en % sous sm (2 cards par ligne garanties sur mobile étroit,
                                    demande utilisateur explicite) puis fixe à 220px à partir de sm. */}
                                <div className="flex flex-wrap gap-4">
                                    {feedItems.map((entry) =>
                                        entry.type === 'property' ? (
                                            <div
                                                key={entry.item.objectID}
                                                className="w-[calc(50%-0.5rem)] sm:w-[220px] animate-fade-in-up transition-all duration-300"
                                            >
                                                <PropertyCard property={entry.item} />
                                            </div>
                                        ) : (
                                            <SponsoredSlot
                                                key={`ad-${entry.key}`}
                                                placement="search_infeed"
                                                province={province}
                                                city={city}
                                                rotationIndex={entry.adIndex}
                                                className="w-full"
                                                fallbackSlot={ADSENSE_SLOTS.searchInline}
                                                fallbackSlotKey={`search-mobile-${entry.key}`}
                                                fallbackCompact
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
                                        <span className="text-xs text-primary bg-primary-100 border border-primary-100 rounded-full px-3 py-1 animate-fade-in-up">
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
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 shadow transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                            aria-label="Aller en haut"
                        >
                            <ChevronUp size={20} />
                        </button>
                        <button
                            onClick={scrollToBottom}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 shadow transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
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
