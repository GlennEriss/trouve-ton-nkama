import Link from 'next/link'
import React from 'react'
import { Button } from '../ui/button'
import PropertyStatistics from './PropertyStatistics'
import { PropertyFilter } from './PropertyFilter'
import ListPropertySection from './ListPropertySection'
import { routes } from '@/constantes/routes'

export default function PropertyList() {
    return (
        <div className="space-y-4 mb-20">
            {/* Barre supérieure avec correction du Dark Mode */}
            <section className="sticky top-0 md:static z-50 bg-white dark:bg-gray-900 px-5 py-4 shadow border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Annonces
                </h1>
                <Button 
                    variant="outline" 
                    className="border-[#146B67] hover:bg-[#146B67] text-[#146B67] hover:text-white dark:border-[#A390F9] dark:hover:bg-[#A390F9] dark:text-[#A390F9] dark:hover:text-black"
                    asChild
                >
                    <Link href={routes.protected.add_property}>
                        Ajouter
                    </Link>
                </Button>
            </section>

            {/* Sections avec correction du Dark Mode */}
            <section className="px-5 bg-white dark:bg-gray-900 dark:py-2">
                <PropertyStatistics />
                <PropertyFilter />
                <ListPropertySection />
            </section>
        </div>
    )
}