'use client'
import React from 'react'
import { useWindowSize } from '@/hooks/useSize';
import HomePageMobileComponent from './HomePageMobileComponent';
import HomePageDesktopComponent from './HomePageDesktopComponent';

export default function HomePageComponent() {
    const { width, height } = useWindowSize();
    if (width < 768) {
        return (
            <HomePageMobileComponent />
        )
    }
    return (
        <HomePageDesktopComponent />
    )
}
