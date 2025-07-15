import PasswordResetFailure from '@/components/password-reset/PasswordResetFailure'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Réinitialisation échouée - Trouve Ton Nkama',
  description: "Le lien de réinitialisation de mot de passe a expiré ou est invalide. Demandez un nouveau lien pour récupérer l'accès à votre compte Trouve Ton Nkama.",
  openGraph: {
    title: 'Erreur de réinitialisation - Trouve Ton Nkama',
    description: 'Lien expiré ou invalide. Obtenez un nouveau lien de réinitialisation pour accéder à votre compte.',
    url: `${process.env.NEXT_PUBLIC_HOST}/password-reset-failure`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/emails/logo-email.png`,
        width: 200,
        height: 200,
        alt: 'Erreur réinitialisation Trouve Ton Nkama',
      },
    ],
  },
}

function PasswordResetFailurePage() {
  return (
    <PasswordResetFailure />
  )
}

export default PasswordResetFailurePage 