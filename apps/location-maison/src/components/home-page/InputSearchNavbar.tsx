import React from 'react'
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { BiSearch } from "react-icons/bi";
import { useAlgoliaContext } from '@/providers/AlgoliaContext';
import { useRouter } from 'next/navigation';
import { useWindowSize } from "@/hooks/useSize";

export default function InputSearchNavbar() {
    const router = useRouter();
    const { width } = useWindowSize();
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
        //params.append("page", "1");
        console.log("params:", params.toString())
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

    return (
        <div>
            <button
                onClick={handleClick}
                className="w-9 h-9 flex items-center justify-center border border-[#146B67] dark:bg-gray-800 rounded-full"
            >
                <Search size={20} className="text-[#146B67]" />
            </button>
            
            {showSearch && width >= 768 && (
                <div 
                    className="absolute top-[calc(100%+1rem)] left-1/2 -translate-x-1/2 bg-white dark:bg-black shadow-xl rounded-2xl p-6 w-[600px] max-w-[90vw] z-50 transition-all duration-300 ease-out origin-top animate-search-appear"
                    style={{
                        animation: 'search-appear 0.3s ease-out'
                    }}
                >
                    <style jsx>{`
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
                            placeholder="Rechercher une propriété..."
                            className="w-full bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white placeholder:text-gray-500 border-none focus-visible:ring-1 focus-visible:ring-[#146B67]/50 dark:focus-visible:ring-[#1FA89B]/50 min-h-[50px] rounded-full pl-12 shadow-inner"
                        />
                    </div>
                    <div
                        onClick={handleSearch}
                        className="absolute right-6 top-6 w-[50px] h-[50px] bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white hover:brightness-110 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <BiSearch className="w-6 h-6" />
                    </div>
                </div>
            )}
        </div>
    )
}
