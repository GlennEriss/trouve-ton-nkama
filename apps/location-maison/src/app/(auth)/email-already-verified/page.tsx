import EmailAlreadyVerified from '@/components/email-verification/EmailAlreadyVerified'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Email déjà vérifié - Trouve Ton Nkama',
  description: "Votre adresse email a déjà été vérifiée. Connectez-vous pour accéder à votre compte Trouve Ton Nkama et profiter de toutes les fonctionnalités.",
  openGraph: {
    title: 'Email vérifié - Trouve Ton Nkama',
    description: 'Votre compte est déjà activé. Connectez-vous pour publier vos annonces et rechercher des propriétés au Gabon.',
    url: `${process.env.NEXT_PUBLIC_HOST}/email-already-verified`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/emails/logo-email.png`,
        width: 200,
        height: 200,
        alt: 'Email vérifié Trouve Ton Nkama',
      },
    ],
  },
}

function EmailAlreadyVerifiedPage() {
  return (
    <EmailAlreadyVerified />
  )
}

export default EmailAlreadyVerifiedPage 