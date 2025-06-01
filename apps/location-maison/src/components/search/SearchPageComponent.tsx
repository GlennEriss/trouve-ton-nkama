"use client"
import { useWindowSize } from '@/hooks/useSize'
import React from 'react'
import SearchMobilePage from './SearchMobilePage'
import SearchDesktopPage from './SearchDesktopPage'

export default function SearchPageComponent() {
    const { width } = useWindowSize()
    return width > 768 ? (
        <SearchDesktopPage />
    ) : (
        <SearchMobilePage />
    )
}
