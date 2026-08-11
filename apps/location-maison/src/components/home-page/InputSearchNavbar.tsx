import React from 'react'
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { BiSearch } from "react-icons/bi";
import { useAlgoliaContext } from '@/providers/AlgoliaContext';
import { useRouter } from 'next/navigation';
import { useWindowSize } from "@/hooks/useSize";
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';

export default function InputSearchNavbar() {
    const router = useRouter();
    const { width } = useWindowSize();
    const { trackEvent } = useTrackEvent();
    const [showSearch, setShowSearch] = React.useState(false);
    const {
        searchText,
        setSearchText,
        city,
        street,
        minPrice,
        maxPrice,
        minArea,
        maxArea,
        minNbrRooms,
        maxNbrRooms,
        typeProperty,
        tags,
    } = useAlgoliaContext();
    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchText) params.append("query", searchText);
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
        params.append("searchSource", "location_maison_search_bar");
        trackEvent(trackingEvents.CTA_SEARCH_SUBMIT_CLICK, {
            source: width < 768 ? 'home_mobile_navbar' : 'home_desktop_navbar',
            has_query: searchText ? 1 : 0,
            has_filters:
                city || street || minPrice || maxPrice || minArea || maxArea || minNbrRooms || maxNbrRooms
                    ? 1
                    : 0,
        });
        router.push(`/search?${params.toString()}`);
    };

    const handleClick = () => {
        if (width < 768) {
            // En mobile : scroll vers le formulaire
            const searchForm = document.querySelector('form[action="/search"]');
            if (searchForm) {
                searchForm.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        } else {
            // En desktop : afficher la barre de recherche
            setShowSearch(!showSearch);
        }
    };
    if (width < 1280) {
        return (
            <div>
                <button
                    type="button"
                    aria-label="Ouvrir la recherche"
                    onClick={handleClick}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-primary dark:bg-gray-800"
                >
                    <Search size={20} className="text-primary" />
                </button>

                {showSearch && width >= 768 && (
                    <div
                        className="absolute top-[calc(100%+1rem)] left-1/2 -translate-x-1/2 bg-white dark:bg-black shadow-xl rounded-2xl p-6 w-[600px] max-w-[90vw] z-50 transition-all duration-300 ease-out origin-top"
                        style={{
                            animation: 'search-appear 0.3s ease-out'
                        }}
                    >
                        <style>{`
                        @keyframes search-appear {
                            0% {
                                opacity: 0;
                                transform: translateX(-50%) translateY(-20px);
                            }
                            100% {
                                opacity: 1;
                                transform: translateX(-50%) translateY(0);
                            }
                        }
                    `}</style>
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <Input
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Rechercher une annonce..."
                                className="w-full bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white placeholder:text-gray-500 border-none focus-visible:ring-1 focus-visible:ring-primary/50 dark:focus-visible:ring-secondary/50 min-h-[50px] rounded-full pl-12 shadow-inner"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch();
                                    }
                                }}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="absolute right-6 top-6 w-[50px] h-[50px] bg-gradient-to-r from-primary via-secondary to-primary text-white hover:brightness-110 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg border-none"
                            aria-label="Lancer la recherche"
                        >
                            <BiSearch className="w-6 h-6" />
                        </button>
                    </div>
                )}
            </div>
        )
    }
    // Nouveau rendu pour les écrans desktop (>= 1280px) : champ et bouton réunis dans une
    // seule pilule, façon leboncoin — le bouton vit à l'intérieur du champ, pas à côté.
    return (
        <div className="flex w-full max-w-xl items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-primary focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-secondary dark:focus-within:bg-gray-900">
            <Search className="h-[18px] w-[18px] shrink-0 text-gray-400" />
            <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Rechercher une annonce…"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSearch();
                    }
                }}
                className="h-9 w-full border-none bg-transparent px-0 text-sm text-black shadow-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white"
            />
            <button
                type="button"
                aria-label="Lancer la recherche"
                onClick={handleSearch}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-800 dark:bg-secondary dark:text-gray-900 dark:hover:bg-primary-400"
            >
                <BiSearch className="h-[18px] w-[18px]" />
            </button>
        </div>
    )
}
