'use client'
import React from 'react'
import { Card, CardContent } from '../ui/card'
import { Home, Building, Layout, MapPin, Briefcase, Globe, House, Landmark, LucideIcon } from 'lucide-react';
import { StatCard } from './StatCard';
import { TypeProperty } from '@/models/annonce';
import { getCountStatisticsByPropertyType } from '@/db/property.db';
import { useCurrentUser } from '@/hooks/use-current-user';


const propertyStatList: { icon: LucideIcon; title: string; value: number; type: TypeProperty }[] = [
    { icon: Globe, title: "Propriétés", value: 0, type: "Property" },
    { icon: Home, title: "Maisons", value: 0, type: "Home" },
    { icon: Building, title: "Appartements", value: 0, type: "Apartment" },
    { icon: Layout, title: "Studios", value: 0, type: "Studio" },
    { icon: Briefcase, title: "Bureaux", value: 0, type: "Desk" },
    { icon: Landmark, title: "Immeubles", value: 0, type: "Building" },
    { icon: House, title: "Villas", value: 0, type: "Villa" },
];

export default function PropertyStatistics() {
    const user = useCurrentUser()
    const [statistics, setStatistics] = React.useState(propertyStatList)
    React.useEffect(() => {
        const fetchStatistics = async () => {
            try {
                // Mettre à jour les valeurs individuellement
                const updatedStats = await Promise.all(
                    statistics.map(async (stat) => {
                        if (stat.type !== "Property") {
                            const count = await getCountStatisticsByPropertyType(user?.uid ?? '', stat.type);
                            return { ...stat, value: count };
                        }
                        return stat;
                    })
                );
                // Calculer la somme pour "Propriétés"
                const totalProperties = updatedStats
                    .filter((stat) => stat.type !== "Property") // Exclure Property
                    .reduce((sum, stat) => sum + stat.value, 0);

                // Mettre à jour la valeur de Propriétés
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
        <Card>
            <CardContent className="p-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:flex">
                {statistics.map((stat, key) => (
                    <StatCard
                        key={key}
                        icon={stat.icon}
                        title={stat.title}
                        value={stat.value}
                        type={stat.type}
                    />
                ))}
            </CardContent>
        </Card>
    );
}