'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { useWindowSize } from '@/hooks/useSize'

// Import dynamique : sans ça, webpack embarque à la fois SigninFormModern (desktop) ET
// SigninMobileComponent (mobile) dans le MÊME bundle client, alors qu'un seul des deux est
// jamais rendu — doublant inutilement le JS envoyé (~395 kB First Load JS mesurés sur /signin
// avant ce correctif). `ssr: false` car le choix dépend de `window.innerWidth`, indisponible
// côté serveur.
const SigninFormModern = dynamic(
    () => import('@/features/auth/ui/v1/SigninFormModern').then((mod) => mod.SigninFormModern),
    { ssr: false, loading: () => <SigninLoadingFallback /> }
)
const SigninMobileComponent = dynamic(() => import('./SigninMobileComponent'), {
    ssr: false,
    loading: () => <SigninLoadingFallback />,
})

function SigninLoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-secondary" />
        </div>
    )
}

export default function SigninComponent() {
    const size = useWindowSize()

    // useWindowSize() vaut 0 tant que la vraie largeur n'a pas été mesurée (effet post-mount).
    // Ne rien choisir avant cette mesure évite de monter puis démonter le mauvais composant
    // dynamique (flash mobile→desktop et double fetch de chunk).
    if (size.width === 0) {
        return <SigninLoadingFallback />
    }

    if (size.width > 768) {
        return <SigninFormModern />
    }
    return <SigninMobileComponent />
}
