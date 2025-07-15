import PasswordReset from '@/components/password-reset/PasswordReset'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Nouveau mot de passe - Trouve Ton Nkama',
  description: "Créez un nouveau mot de passe sécurisé pour votre compte Trouve Ton Nkama. Choisissez un mot de passe fort pour protéger vos données.",
  openGraph: {
    title: 'Nouveau mot de passe - Trouve Ton Nkama',
    description: 'Définissez un nouveau mot de passe sécurisé pour retrouver l\'accès à votre compte Trouve Ton Nkama.',
    url: `${process.env.NEXT_PUBLIC_HOST}/password-reset`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/emails/logo-email.png`,
        width: 200,
        height: 200,
        alt: 'Nouveau mot de passe Trouve Ton Nkama',
      },
    ],
  },
}

function PasswordResetPage() {
  return (
    <PasswordReset />
  )
}

export default PasswordResetPage 