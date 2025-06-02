import SigninComponent from '@/components/signin/SigninComponent'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Connexion à votre compte - LogisGabon',
  description: "Accédez à votre compte LogisGabon pour publier vos annonces, gérer vos propriétés et suivre vos favoris facilement.",
  openGraph: {
    title: 'Connexion - LogisGabon',
    description: 'Rejoignez LogisGabon pour publier vos biens, trouver votre maison idéale, et profiter d’un espace personnel sécurisé.',
    url: `${process.env.NEXT_PUBLIC_HOST}/signin`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.png`,
        width: 1200,
        height: 630,
        alt: 'Connexion LogisGabon',
      },
    ],
  },
}

export default function page() {
  return (
    <SigninComponent/>
  )
}
