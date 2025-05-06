'use client';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getCountStatisticsByPropertyType } from '@/db/property.db';
import { Home, Building, Layout, Briefcase, Globe, Landmark, Bed, Store, ShoppingCart, LucideIcon, Mountain } from 'lucide-react';
import { TypeProperty } from '@/models/annonce';

const propertyStatList: { icon: LucideIcon; title: string; value: number; type: TypeProperty }[] = [
    { icon: Globe, title: "Propriétés", value: 0, type: "Property" },
    { icon: Home, title: "Maisons", value: 0, type: "Home" },
    { icon: Building, title: "Appartements", value: 0, type: "Apartment" },
    { icon: Layout, title: "Studios", value: 0, type: "Studio" },
    { icon: Bed, title: "Chambres", value: 0, type: "Room" },
    { icon: Store, title: "Kiosques", value: 0, type: "Kiosk" },
    { icon: Briefcase, title: "Bureaux", value: 0, type: "Desk" },
    { icon: Landmark, title: "Immeubles", value: 0, type: "Building" },
    { icon: ShoppingCart, title: "Magasin", value: 0, type: "Shop" },
    { icon: Mountain, title: "Terrains", value: 0, type: "Land" },
];

export function usePropertiesStatByUserId() {
    const { user } = useCurrentUser();

    const { data: statistics = propertyStatList, isLoading, error } = useQuery({
        queryKey: ['property-statistics', user?.uid],
        queryFn: async () => {
            if (!user?.uid) return propertyStatList;

            const updatedStats = await Promise.all(
                propertyStatList.map(async (stat) => {
                    if (stat.type !== "Property") {
                        const count = await getCountStatisticsByPropertyType(user.uid, stat.type);
                        return { ...stat, value: count };
                    }
                    return stat;
                })
            );

            const totalProperties = updatedStats
                .filter(stat => stat.type !== "Property")
                .reduce((sum, stat) => sum + stat.value, 0);

            return updatedStats.map((stat) =>
                stat.type === "Property" ? { ...stat, value: totalProperties } : stat
            );
        },
        enabled: !!user?.uid, // N'exécuter la requête que si l'utilisateur est prêt
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 15,
        refetchOnWindowFocus: false,
    });

    return { statistics, isLoading, error };
}