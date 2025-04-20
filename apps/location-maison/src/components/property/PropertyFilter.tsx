"use client";

import React from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Building, Layout, MapPin, List, Briefcase, House, Landmark, ShoppingCart, Store, Bed } from "lucide-react";
import { Button } from "@/components/ui/button";

// Types des filtres
const filters = [
    { label: "Tous", value: "", icon: List },
    { label: "Maisons", value: "home", icon: Home },
    { label: "Appartements", value: "apartment", icon: Building },
    { label: "Studios", value: "studio", icon: Layout },
    { label: "Terrains", value: "land", icon: MapPin },
    { label: "Bureaux", value: "desk", icon: Briefcase },
    { label: "Immeubles", value: "building", icon: Landmark },
    { label: "Magasins", value: "shop", icon: ShoppingCart },
    { label: "Kiosques", value: "kiosk", icon: Store },
    { label: "Chambres", value: "room", icon: Bed },
];

export const PropertyFilter = () => {
    const searchParams = useSearchParams(); // Récupère les paramètres de l'URL
    const pathname = usePathname(); // Récupère le chemin actuel
    const router = useRouter(); // Permet de changer de route

    const currentFilter = searchParams.get("type") || "";

    // Fonction pour changer le filtre
    const handleFilterChange = (value: string) => {
        const params = new URLSearchParams(searchParams);

        if (value) {
            params.set("type", value);
        } else {
            params.delete("type"); // Supprime le query param si "Tous" est sélectionné
        }

        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex items-center gap-4 py-4 px-2 overflow-x-auto w-full">
            {filters.map((filter) => {
                const isActive = currentFilter === filter.value;

                return (
                    <Button
                        key={filter.value}
                        onClick={() => handleFilterChange(filter.value)}
                        variant={isActive ? "default" : "outline"} // Change de style si actif
                        className={cn(
                            "flex items-center justify-center gap-2 rounded-md transition",
                            isActive ? "bg-[#146B67] hover:bg-[#146B67] text-white" : "text-gray-600",
                            "sm:w-auto w-10 h-10 sm:h-auto"
                        )}
                    >
                        <filter.icon size={20} className={cn("sm:block", isActive && "text-white")} />
                        <span className="hidden lg:inline">{filter.label}</span>
                    </Button>
                );
            })}
        </div>
    );
};