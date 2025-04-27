import SignupComponent from '@/components/signup/SignupComponent'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Inscription - LogisGabon',
  description: "Créez votre compte sur LogisGabon pour publier vos annonces immobilières, gérer vos logements et trouver votre futur chez-vous en toute simplicité.",
}
export default function page() {
  return (
    <SignupComponent />
  )
}
