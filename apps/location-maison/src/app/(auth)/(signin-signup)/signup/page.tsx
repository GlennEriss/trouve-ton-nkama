import SignupComponent from '@/components/signup/SignupComponent'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Inscription - Trouve Ton Nkama',
  description: "Créez votre compte gratuitement sur Trouve Ton Nkama pour publier vos annonces immobilières, suivre vos biens favoris et trouver votre futur logement au Gabon.",
  openGraph: {
    title: 'Inscription sur Trouve Ton Nkama',
    description: 'Rejoignez Trouve Ton Nkama et accédez à une plateforme dédiée à l’immobilier gabonais. Inscrivez-vous en quelques clics pour publier et gérer vos annonces.',
    url: `${process.env.NEXT_PUBLIC_HOST}/signup`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.svg`,
        width: 1200,
        height: 630,
        alt: 'Inscription Trouve Ton Nkama',
      },
    ],
  },
}
export default function page() {
  return (
    <SignupComponent />
  )
}
