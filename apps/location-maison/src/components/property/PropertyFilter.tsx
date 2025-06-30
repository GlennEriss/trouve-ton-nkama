"use client";

import React from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Building, Layout, MapPin, List, Briefcase, Landmark, ShoppingCart, Store, Bed } from "lucide-react";

// Types des filtres avec couleurs personnalisées
const filters = [
    { label: "Tous", value: "", icon: List, color: "from-gray-500 to-gray-600" },
    { label: "Maisons", value: "home", icon: Home, color: "from-blue-500 to-blue-600" },
    { label: "Appartements", value: "apartment", icon: Building, color: "from-purple-500 to-purple-600" },
    { label: "Studios", value: "studio", icon: Layout, color: "from-green-500 to-green-600" },
    { label: "Terrains", value: "land", icon: MapPin, color: "from-orange-500 to-orange-600" },
    { label: "Bureaux", value: "desk", icon: Briefcase, color: "from-indigo-500 to-indigo-600" },
    { label: "Immeubles", value: "building", icon: Landmark, color: "from-red-500 to-red-600" },
    { label: "Magasins", value: "shop", icon: ShoppingCart, color: "from-pink-500 to-pink-600" },
    { label: "Kiosques", value: "kiosk", icon: Store, color: "from-yellow-500 to-yellow-600" },
    { label: "Chambres", value: "room", icon: Bed, color: "from-teal-500 to-teal-600" },
];

export const PropertyFilter = () => {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const currentFilter = searchParams.get("type") ?? "";

    // Fonction pour changer le filtre
    const handleFilterChange = (value: string) => {
        const params = new URLSearchParams(searchParams);

        if (value) {
            params.set("type", value);
        } else {
            params.delete("type");
        }

        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Auto-scroll vers l'élément actif
    React.useEffect(() => {
        if (scrollRef.current) {
            const activeIndex = filters.findIndex(filter => filter.value === currentFilter);
            if (activeIndex !== -1) {
                const activeElement = scrollRef.current.children[activeIndex] as HTMLElement;
                if (activeElement) {
                    activeElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                    });
                }
            }
        }
    }, [currentFilter]);

    return (
        <div className="relative py-6 px-4">
            {/* Titre de section */}
            <div className="mb-4 px-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Filtrer par type
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Glissez pour explorer les différents types de propriétés
                </p>
            </div>

            {/* Gradients de fade sur les côtés */}
            <div className="absolute left-0 top-6 bottom-0 w-8 bg-gradient-to-r from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 dark:to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-6 bottom-0 w-8 bg-gradient-to-l from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 dark:to-transparent z-10 pointer-events-none" />

            {/* Slider horizontal */}
            <div 
                ref={scrollRef}
                className="flex gap-3 px-4 md:px-2 overflow-x-auto scrollbar-hide scroll-smooth pb-2 py-2"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                {filters.map((filter, index) => {
                    const isActive = currentFilter === filter.value;
                    const IconComponent = filter.icon;

                    return (
                        <button
                            key={filter.value}
                            onClick={() => handleFilterChange(filter.value)}
                            className={cn(
                                "group relative flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 min-w-[100px] border-2",
                                isActive 
                                    ? "bg-gradient-to-br from-[#146B67] to-[#1FA89B] text-white border-transparent shadow-xl" 
                                    : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg",
                                "focus:outline-none focus:ring-2 focus:ring-[#146B67] focus:ring-offset-2"
                            )}
                        >
                            {/* Icône avec gradient de fond */}
                            <div className={cn(
                                "relative p-3 rounded-xl transition-all duration-300",
                                isActive 
                                    ? "bg-white/20 backdrop-blur-sm" 
                                    : `bg-gradient-to-br ${filter.color} shadow-md group-hover:shadow-lg`
                            )}>
                                <IconComponent 
                                    size={24} 
                                    className={cn(
                                        "transition-all duration-300",
                                        isActive ? "text-white" : "text-white"
                                    )} 
                                />
                                
                                {/* Pulse effect pour l'élément actif */}
                                {isActive && (
                                    <div className="absolute inset-0 rounded-xl bg-white/30 animate-pulse" />
                                )}
                            </div>

                            {/* Label */}
                            <span className={cn(
                                "text-sm font-medium transition-all duration-300 text-center",
                                isActive ? "text-white" : "text-gray-700 dark:text-gray-300"
                            )}>
                                {filter.label}
                            </span>

                            {/* Indicateur actif */}
                            {isActive && (
                                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-md" />
                            )}

                            {/* Effet de brillance au hover */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </button>
                    );
                })}
            </div>

            {/* Indicateur de scroll (optionnel) */}
            <div className="flex justify-center mt-4">
                <div className="flex gap-1">
                    {[...Array(Math.ceil(filters.length / 3))].map((_, i) => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 opacity-30"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};