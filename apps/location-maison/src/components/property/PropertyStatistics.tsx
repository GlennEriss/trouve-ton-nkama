'use client'
import React from 'react'
import { Card, CardContent } from '../ui/card'
import { StatCard } from './StatCard';
import { usePropertiesStatByUserId } from '@/hooks/use-properties-stat-by-user-id';

export default function PropertyStatistics() {
    const { statistics } = usePropertiesStatByUserId();
    const [isExpanded, setIsExpanded] = React.useState(false);

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
                    className="mt-4 px-4 py-2 bg-[#146B67] text-white rounded-lg transition hover:bg-[#146B67]"
                >
                    {isExpanded ? "Réduire" : "Afficher plus"}
                </button>
            )}
        </Card>
    );
}