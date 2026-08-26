'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { useWindowSize } from '@/hooks/useSize'

// Import dynamique : sans ça, webpack embarque à la fois SignupFormModern (desktop) ET
// SignupMobileComponent (mobile) dans le MÊME bundle client, alors qu'un seul des deux est
// jamais rendu — doublant inutilement le JS envoyé (~540 kB First Load JS mesurés sur /signup
// avant ce correctif). `ssr: false` car le choix dépend de `window.innerWidth`, indisponible
// côté serveur.
const SignupFormModern = dynamic(
    () => import('@/features/auth/ui/v1/SignupFormModern').then((mod) => mod.SignupFormModern),
    { ssr: false, loading: () => <SignupLoadingFallback /> }
)
const SignupMobileComponent = dynamic(
    () => import('./SignupMobileComponent').then((mod) => mod.SignupMobileComponent),
    { ssr: false, loading: () => <SignupLoadingFallback /> }
)

function SignupLoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-secondary" />
        </div>
    )
}

export default function SignupComponent() {
    const size = useWindowSize()

    // useWindowSize() vaut 0 tant que la vraie largeur n'a pas été mesurée (effet post-mount).
    // Ne rien choisir avant cette mesure évite de monter puis démonter le mauvais composant
    // dynamique (flash mobile→desktop et double fetch de chunk).
    if (size.width === 0) {
        return <SignupLoadingFallback />
    }

    // Use modern design for desktop, existing mobile design for mobile
    if (size.width > 768) {
        return <SignupFormModern />
    }

    return <SignupMobileComponent />
}
