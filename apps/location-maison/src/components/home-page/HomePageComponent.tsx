'use client'
import React, { useState } from 'react'
import { useWindowSize } from '@/hooks/useSize';
import HomePageMobileComponent from './HomePageMobileComponent';
import HomePageDesktopComponent from './HomePageDesktopComponent';

export default function HomePageComponent() {
    const { width } = useWindowSize();

    const composantMobileOuPc = () => (
        width < 768
            ? <HomePageMobileComponent />
            : <HomePageDesktopComponent />
    );

    return (
        <>
            {composantMobileOuPc()}
        </>
    );
}
