import SigninComponent from '@/components/signin/SigninComponent'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Connexion - LogisGabon',
  description: 'Connectez-vous à LogisGabon pour accéder à votre espace personnel, publier vos annonces immobilières, et gérer vos logements en toute simplicité.',
}

export default function page() {
  return (
    <SigninComponent/>
  )
}
