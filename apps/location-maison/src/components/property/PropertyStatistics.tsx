'use client'
import React from 'react'
import { Card, CardContent } from '../ui/card'
import { Home, Building, Layout, Briefcase, Globe, Landmark, Bed, Store, ShoppingCart, LucideIcon } from 'lucide-react';
import { StatCard } from './StatCard';
import { TypeProperty } from '@/models/annonce';
import { getCountStatisticsByPropertyType } from '@/db/property.db';
import { useCurrentUser } from '@/hooks/use-current-user';

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
];

export default function PropertyStatistics() {
    const { user } = useCurrentUser();
    const [statistics, setStatistics] = React.useState(propertyStatList);
    const [isExpanded, setIsExpanded] = React.useState(false);

    React.useEffect(() => {
        const fetchStatistics = async () => {
            try {
                const updatedStats = await Promise.all(
                    statistics.map(async (stat) => {
                        if (stat.type !== "Property") {
                            const count = await getCountStatisticsByPropertyType(user?.uid ?? '', stat.type);
                            return { ...stat, value: count };
                        }
                        return stat;
                    })
                );

                const totalProperties = updatedStats
                    .filter(stat => stat.type !== "Property") // Exclure "Property" du calcul total
                    .reduce((sum, stat) => sum + stat.value, 0);
                const finalStats = updatedStats.map((stat) =>
                    stat.type === "Property" ? { ...stat, value: totalProperties } : stat
                );

                setStatistics(finalStats);
            } catch (error) {
                console.error("Failed to fetch property statistics:", error);
            }
        };

        fetchStatistics();
    }, [user]);

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Statistiques des Propriétés</h2>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(isExpanded || window.innerWidth >= 1024 ? statistics : [statistics[0]]).map((stat, key) => (
                    <StatCard
                        key={key}
                        icon={stat.icon}
                        title={stat.title}
                        value={stat.value}
                        type={stat.type}
                    />
                ))}
            </CardContent>
            {window.innerWidth < 1024 && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg transition hover:bg-blue-700"
                >
                    {isExpanded ? "Réduire" : "Afficher plus"}
                </button>
            )}
        </Card>
    );
}