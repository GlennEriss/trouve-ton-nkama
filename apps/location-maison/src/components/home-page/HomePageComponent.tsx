'use client'
import React from 'react'
import HomePage from './HomePage';
import Navbar from './Navbar';
import { useWindowSize } from '@/hooks/useSize';
import HomePageMobileComponent from './HomePageMobileComponent';

export default function HomePageComponent() {
    const { width, height } = useWindowSize();
    if (width < 768) {
        return (
            <HomePageMobileComponent />
        )
    }
    return (
        <div className="bg-gray-100 dark:bg-gray-900">
            <Navbar />
            <HomePage />
        </div>
    )
}
