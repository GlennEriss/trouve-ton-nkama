import SigninSignupComponent from '@/components/signin/SigninSignupComponent'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
    title: 'Bienvenue sur LogisGabon',
    description: 'Connectez-vous ou créez votre compte pour découvrir et publier des annonces immobilières facilement. Votre nouveau logement vous attend !'
}

export default function page() {
    return (
        <SigninSignupComponent/>
    )
}
