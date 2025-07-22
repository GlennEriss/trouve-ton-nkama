'use client'
import React, { useState } from 'react'
import { useWindowSize } from '@/hooks/useSize';
import HomePageMobileComponent from './HomePageMobileComponent';
import HomePageDesktopComponent from './HomePageDesktopComponent';
import InstallPWAButton, { InstallPWAButtonTrigger } from "@/components/pwa/InstallPWAButton";

export default function HomePageComponent() {
    const { width } = useWindowSize();
    const [showModal, setShowModal] = useState(false);

    const composantMobileOuPc = () => (
        width < 768
            ? <HomePageMobileComponent />
            : <HomePageDesktopComponent />
    );

    return (
        <>
            {composantMobileOuPc()}
            <InstallPWAButton forceOpen={showModal} />
            <InstallPWAButtonTrigger onClick={() => setShowModal(true)} />
        </>
    );
}
