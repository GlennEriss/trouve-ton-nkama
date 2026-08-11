'use client'
import React from 'react'
import Navbar from '../home-page/Navbar'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { routes } from '@/constantes/routes'

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const pathname = usePathname()
    const isSearchPage = pathname === routes.public.search_property
    const isSearchWithIAPage = pathname === routes.public.search_with_ia
    const isMapPage = pathname === '/map'
    const isFullHeightPage = isSearchPage || isSearchWithIAPage || isMapPage
    
    return (
        <main className={cn('', isFullHeightPage && 'lg:overflow-hidden lg:h-screen')}>
            <Navbar />
            {children}
        </main>
    )
}
