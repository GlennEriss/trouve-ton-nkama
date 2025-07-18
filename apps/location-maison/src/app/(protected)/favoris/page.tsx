import SectionFavoris from '@/components/favoris/SectionFavoris'
import React from 'react'

export default function page() {
    return (
        <div className='space-y-4 mb-20 dark:bg-gray-900 min-h-screen'>
            {/* En-tête */}
            <div className='sticky top-0 md:static z-50 bg-white dark:bg-gray-800 px-5 pt-1 md:pt-4 pb-4 shadow border-b dark:border-gray-700 flex items-center justify-between'>
                <h1 className='text-xl font-bold text-gray-900 dark:text-white'>Mes favoris</h1>
            </div>
            
            {/* Section des favoris */}
            <SectionFavoris/>
        </div>
    )
}