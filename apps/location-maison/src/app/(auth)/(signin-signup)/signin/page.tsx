import SigninComponent from '@/components/signin/SigninComponent'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Connexion à votre compte - Trouve Ton Nkama',
  description: "Accédez à votre compte Trouve Ton Nkama pour publier vos annonces, gérer vos propriétés et suivre vos favoris facilement.",
  openGraph: {
    title: 'Connexion - Trouve Ton Nkama',
    description: 'Rejoignez Trouve Ton Nkama pour publier vos biens, trouver votre maison idéale, et profiter d’un espace personnel sécurisé.',
    url: `${process.env.NEXT_PUBLIC_HOST}/signin`,
    type: 'website',
            images: [
            {
                url: `${process.env.NEXT_PUBLIC_HOST}/linkedin-og.jpg`,
                width: 1200,
                height: 630,
                alt: 'Connexion Trouve Ton Nkama',
            },
        ],
  },
}

export default function page() {
  return (
    <SigninComponent/>
  )
}
