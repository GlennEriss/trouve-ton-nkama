import SectionFavoris from '@/components/favoris/SectionFavoris'
import React from 'react'

export default function page() {
    return (
        <div className='space-y-4'>
            <div className='sticky top-0 md:static z-50 bg-white px-5 py-4 shadow border-b flex items-center justify-between'>
                <h1 className='text-xl font-bold'>Mes favoris</h1>
            </div>
            <SectionFavoris/>
        </div>
    )
}
