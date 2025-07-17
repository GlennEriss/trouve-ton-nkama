import SigninSignupComponent from '@/components/signin/SigninSignupComponent'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
    title: 'Trouve Ton Nkama - Connexion ou Inscription',
    description: "Accédez facilement à votre espace personnel ou créez un nouveau compte sur Trouve Ton Nkama. Explorez, publiez et trouvez votre logement idéal au Gabon.",
    openGraph: {
        title: 'Connexion ou Inscription - Trouve Ton Nkama',
        description: 'Choisissez de vous connecter ou de créer un compte pour accéder à toutes les fonctionnalités de Trouve Ton Nkama et découvrir les meilleures annonces immobilières.',
        url: `${process.env.NEXT_PUBLIC_HOST}/signin-signup`,
        type: 'website',
        images: [
            {
                url: `${process.env.NEXT_PUBLIC_HOST}/logo.webp`,
                width: 1200,
                height: 630,
                alt: 'Connexion ou Inscription Trouve Ton Nkama',
            },
        ],
    },
};

export default function page() {
    return (
        <SigninSignupComponent />
    )
}
