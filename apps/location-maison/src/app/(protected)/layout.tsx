'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Navbar from "@/components/home-page/Navbar";
import PhoneVerificationBanner from "@/components/navbar/PhoneVerificationBanner";
import { isSingleReelViewRoute } from '@/lib/reels/single-reel-route'

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()

  // Vue plein écran d'un réel unique (h-[100dvh]) : la navbar sticky ajouterait sa propre
  // hauteur en plus de ces 100dvh et ferait scroller la page au lieu d'un rendu figé.
  if (isSingleReelViewRoute(pathname)) {
    return <>{children}</>
  }

  return (
    <div className='min-h-screen'>
      <div className="sticky top-0 z-50">
        <Navbar />
        <PhoneVerificationBanner />
      </div>
      {children}
    </div>
  );
}
