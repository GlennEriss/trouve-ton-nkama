import React from 'react'
import Form from 'next/form'
import { Search, MapPin } from 'lucide-react';
import { Input } from '../ui/input';
import { FilterModalHomePage } from '../home-page/FilterModalHomePage';
import { useAlgoliaContext } from '@/providers/AlgoliaContext';
import { useInfiniteHits, useStats } from 'react-instantsearch';
import PropertyCard from '../home-page/PropertyCard';
import { useSearchParams } from 'next/navigation';
import GoogleMapViewer from './GoogleMapViewer';

export default function SearchMobilePage() {
    const { searchText, setSearchText, province, city, street, minPrice, maxPrice, minArea, maxArea, minNbrRooms, maxNbrRooms, typeProperty, status, tags, setProvince, setCity, setStreet, setMinPrice, setMaxPrice, setMinArea, setMaxArea, setMinNbrRooms, setMaxNbrRooms, setTypeProperty, setStatus, setTags } = useAlgoliaContext()
    const topRef = React.useRef<HTMLDivElement>(null);
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const { items, isLastPage, showMore } = useInfiniteHits();
    const { nbHits } = useStats();
    const searchParams = useSearchParams();

    // État pour la carte en plein écran
    const [showMap, setShowMap] = React.useState(false);
    const [mapCenter, setMapCenter] = React.useState({ lat: 0.3476, lng: 9.4523 }); // Libreville par défaut

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
    }, [searchParams.toString(), setSearchText, setProvince, setCity, setStreet, setMinPrice, setMaxPrice, setMinArea, setMaxArea, setMinNbrRooms, setMaxNbrRooms, setTypeProperty, setTags]);

    // Infinite hits + intersection observer
    React.useEffect(() => {
        if (!sentinelRef.current) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isLastPage) {
                    showMore();
                }
            },
            { rootMargin: "200px" }
        );
        obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }, [sentinelRef, isLastPage, showMore]);

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
                                onClick={() => setShowMap(true)}
                                className='flex items-center gap-2 px-4 py-2 bg-[#146B67] text-white rounded-full text-sm font-medium hover:bg-[#1FA89B] transition-colors'
                            >
                                <MapPin className="w-4 h-4" />
                                Carte
                            </button>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {items.map((propertyData, i) => (
                                        <PropertyCard key={propertyData.objectID} property={propertyData} />
                                    ))}
                                </div>

                                {/* Sentinel pour infinite scroll */}
                                <div ref={sentinelRef} />

                                {/* Bouton "Voir plus" */}
                                {!isLastPage && (
                                    <div className="text-center mt-6">
                                        <button
                                            onClick={showMore}
                                            className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-lg px-3 py-2 font-semibold hover:brightness-110 hover:shadow-md transition"
                                        >
                                            Voir plus
                                        </button>
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
                            ↑
                        </button>
                        <button
                            onClick={scrollToBottom}
                            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            aria-label="Aller en bas"
                        >
                            ↓
                        </button>
                    </div>
                </section>
            </div>

            {/* Carte en modal */}
            <GoogleMapViewer
                lat={mapCenter.lat}
                lng={mapCenter.lng}
                open={showMap}
                onOpenChange={setShowMap}
            />
        </>
    );
}
