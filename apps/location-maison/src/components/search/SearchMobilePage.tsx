import React from 'react'
import Form from 'next/form'
import { Search, MapPin } from 'lucide-react';
import { Input } from '../ui/input';
import { FilterModalHomePage } from '../home-page/FilterModalHomePage';
import { useAlgoliaContext } from '@/providers/AlgoliaContext';
import { useConfigure, useInfiniteHits, useSearchBox } from 'react-instantsearch';
import PropertyCard from '../home-page/PropertyCard';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

export default function SearchMobilePage() {
    const searchParams = useSearchParams();
    const { searchText, setSearchText, setCity, setStreet, setMinPrice, setMaxPrice, setMinArea, setMaxArea, setMinNbrRooms, setMaxNbrRooms, setTypeProperty, setTags } = useAlgoliaContext()
    const topRef = React.useRef<HTMLDivElement>(null);
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const { items, isLastPage, showMore } = useInfiniteHits();

    // Scroll handlers
    const scrollToTop = () => {
        topRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    const scrollToBottom = () => {
        sentinelRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Recherche texte
    const { refine: refineQuery } = useSearchBox();
    const queryVal = searchParams.get("query") ?? "";
    React.useEffect(() => {
        refineQuery(queryVal);
    }, [queryVal]);

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

    // Filtres
    const filtersString = React.useMemo(() => {
        const f: string[] = [];
        const cityVal = searchParams.get("city") ?? "";
        const streetVal = searchParams.get("street") ?? "";
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
        <div className='p-5 space-y-5' ref={topRef}>
            <section className='md:hidden'>
                <h1 className='text-2xl font-bold text-[#146B67]'>
                    Rechercher un logement
                </h1>
                <p className='text-sm text-gray-500'>
                    Trouvez le logement de vos rêves parmi nos annonces immobilières.
                </p>
                <Form action="/search">
                    <div className="flex items-center border rounded-full p-2 px-4 bg-gray-100 focus-within:border-[#1FA89B]">
                        <button
                            type='submit'
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
                        <button
                            type='button'
                        >
                            <FilterModalHomePage />
                        </button>
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
                            {items.length} résultats trouvés
                        </p>
                    </div>
                    <button
                        type='button'
                        className='hidden md:flex items-center gap-2'
                    >
                        <FilterModalHomePage /> 
                    </button>
                </div>

                <div>
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Image
                                src="/no-favorites.svg"
                                alt="Aucun résultat trouvé"
                                width={240}
                                height={240}
                                className="opacity-70"
                            />
                            <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">
                                Aucun bien ne correspond à ces critères.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchText("");
                                    setCity("");
                                    setStreet("");
                                    setMinPrice("");
                                    setMaxPrice("");
                                    setMinArea("");
                                    setMaxArea("");
                                    setMinNbrRooms("");
                                    setMaxNbrRooms("");
                                    setTypeProperty([]);
                                    setTags([]);
                                }}
                                className="mt-4 px-4 py-2 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded hover:brightness-110 transition"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Grille de résultats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {items.map((propertyData, i) => (
                                    <PropertyCard key={i} property={propertyData} index={i} />
                                ))}
                            </div>

                            {/* Sentinel pour infinite scroll */}
                            <div ref={sentinelRef} />

                            {/* Bouton “Voir plus” */}
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
                <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
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
    )
}
