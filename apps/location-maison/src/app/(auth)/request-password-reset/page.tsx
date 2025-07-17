import PasswordResetRequest from '@/components/password-reset/PasswordResetRequest'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Réinitialiser votre mot de passe - Trouve Ton Nkama',
  description: "Mot de passe oublié ? Réinitialisez facilement votre mot de passe Trouve Ton Nkama en quelques étapes simples. Recevez un lien sécurisé par email.",
  openGraph: {
    title: 'Réinitialisation de mot de passe - Trouve Ton Nkama',
    description: 'Récupérez l\'accès à votre compte Trouve Ton Nkama en réinitialisant votre mot de passe de façon sécurisée.',
    url: `${process.env.NEXT_PUBLIC_HOST}/request-password-reset`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/emails/logo-email.png`,
        width: 200,
        height: 200,
        alt: 'Réinitialisation Trouve Ton Nkama',
      },
    ],
  },
}

function RequestPasswordResetPage() {
  return (
    <PasswordResetRequest />
  )
}

export default RequestPasswordResetPage 