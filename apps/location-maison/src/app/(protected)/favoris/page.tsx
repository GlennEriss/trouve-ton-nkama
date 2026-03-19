import SectionFavoris from '@/components/favoris/SectionFavoris'
import AppMobileStickyHeader from '@/components/shared/AppMobileStickyHeader'
import React from 'react'

export default function page() {
    return (
        <div className='space-y-4 mb-20 dark:bg-gray-900 min-h-screen'>
            <AppMobileStickyHeader
                title='Mes favoris'
                mobileOnly={false}
                className='bg-white dark:bg-gray-800 px-5 py-3 md:pt-4 pb-4'
            />
            
            {/* Section des favoris */}
            <SectionFavoris/>
        </div>
    )
}
