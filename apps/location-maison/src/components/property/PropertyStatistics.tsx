'use client'
import React from 'react'
import { usePropertiesStatByUserId } from '@/hooks/use-properties-stat-by-user-id'
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'

export default function PropertyStatistics() {
    const { statistics } = usePropertiesStatByUserId()
    const [currentIndex, setCurrentIndex] = React.useState(0)
    const [isClient, setIsClient] = React.useState(false)

    React.useEffect(() => {
        setIsClient(true)
    }, [])

    const nextStat = () => {
        setCurrentIndex((prev) => (prev + 1) % statistics.length)
    }

    const prevStat = () => {
        setCurrentIndex((prev) => (prev - 1 + statistics.length) % statistics.length)
    }

    if (!isClient) {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={`skeleton-stat-${i}`} className="h-16 bg-gray-200 dark:bg-gray-600 rounded-xl"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-750 dark:to-gray-700 rounded-2xl p-6 border border-blue-100 dark:border-gray-600 shadow-sm">
            {/* Header compact */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        Vos statistiques
                    </h3>
                </div>
                
                {/* Navigation mobile uniquement */}
                <div className="flex md:hidden items-center gap-2">
                    <button
                        onClick={prevStat}
                        className="p-1.5 bg-white dark:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all"
                        disabled={statistics.length <= 1}
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[40px] text-center">
                        {currentIndex + 1}/{statistics.length}
                    </span>
                    <button
                        onClick={nextStat}
                        className="p-1.5 bg-white dark:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all"
                        disabled={statistics.length <= 1}
                    >
                        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Stats Desktop - Grid horizontal */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statistics.map((stat) => {
                    const IconComponent = stat.icon
                    return (
                        <div 
                            key={stat.title}
                            className="group bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                    <IconComponent className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                                        {stat.title}
                                    </p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Stats Mobile - Carousel */}
            <div className="md:hidden">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-600 shadow-sm">
                    <div className="flex items-center justify-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                            {statistics[currentIndex] ? (
                                (() => {
                                    const IconComponent = statistics[currentIndex].icon
                                    return <IconComponent className="w-6 h-6 text-white" />
                                })()
                            ) : (
                                <TrendingUp className="w-6 h-6 text-white" />
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                {statistics[currentIndex]?.title}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {statistics[currentIndex]?.value}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Indicateurs de pagination */}
                {statistics.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-4">
                        {statistics.map((stat, index) => (
                            <button
                                key={stat.title}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    index === currentIndex 
                                        ? 'bg-blue-500 w-6' 
                                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Résumé compact en bas */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-600">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                        Dernière mise à jour: maintenant
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        En temps réel
                    </span>
                </div>
            </div>
        </div>
    )
}