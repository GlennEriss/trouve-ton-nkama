import SignupComponent from '@/components/signup/SignupComponent'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Inscription - LogisGabon',
  description: "Créez votre compte gratuitement sur LogisGabon pour publier vos annonces immobilières, suivre vos biens favoris et trouver votre futur logement au Gabon.",
  openGraph: {
    title: 'Inscription sur LogisGabon',
    description: 'Rejoignez LogisGabon et accédez à une plateforme dédiée à l’immobilier gabonais. Inscrivez-vous en quelques clics pour publier et gérer vos annonces.',
    url: `${process.env.NEXT_PUBLIC_HOST}/signup`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.png`,
        width: 1200,
        height: 630,
        alt: 'Inscription LogisGabon',
      },
    ],
  },
}
export default function page() {
  return (
    <SignupComponent />
  )
}
