'use client'
import React from 'react'
import Navbar from '../home-page/Navbar'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { routes } from '@/constantes/routes'

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const pathname = usePathname()
    const isSearchPage = pathname === routes.public.search_property
    const isMapPage = pathname === '/map'
    const isFullHeightPage = isSearchPage || isMapPage
    
    return (
        <main className={cn('', isFullHeightPage && 'lg:overflow-hidden lg:h-screen')}>
            <div className="md:p-5 sticky top-0 z-50">
                <Navbar />
            </div>
            {children}
        </main>
    )
}
