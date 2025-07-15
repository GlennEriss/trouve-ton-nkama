import EmailVerificationSuccess from '@/components/email-verification/EmailVerificationSuccess'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Email vérifié avec succès - Trouve Ton Nkama',
  description: "Félicitations ! Votre email a été vérifié avec succès. Votre compte Trouve Ton Nkama est maintenant activé et vous avez reçu 3 crédits gratuits.",
  openGraph: {
    title: 'Vérification réussie - Trouve Ton Nkama',
    description: 'Votre compte est activé ! Commencez dès maintenant à publier vos annonces et rechercher des propriétés au Gabon.',
    url: `${process.env.NEXT_PUBLIC_HOST}/email-verification-success`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/emails/logo-email.png`,
        width: 200,
        height: 200,
        alt: 'Vérification réussie Trouve Ton Nkama',
      },
    ],
  },
}

function EmailVerificationSuccessPage() {
  return (
    <EmailVerificationSuccess />
  )
}

export default EmailVerificationSuccessPage 