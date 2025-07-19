'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { routes } from '@/constantes/routes'
import Logo from '@/components/logo/Logo'
import { CheckCircle } from 'lucide-react'
import { supportContact } from "@/constantes";

const EmailAlreadyVerified: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center py-5">
      {/* Container */}
      <div className="w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg overflow-hidden">
        
        {/* Header avec gradient */}
        <div className="bg-gradient-to-br from-[#146B67] via-[#1FA89B] to-[#146B67] text-white p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Link href={routes.public.homePage}>
              <Logo width="64px" height="64px" />
            </Link>
            <h1 className="text-2xl font-bold ml-3">
              Trouve Ton Nkama
            </h1>
          </div>
          <div className="text-6xl mb-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            Email déjà vérifié
          </h2>
          <p className="text-lg opacity-90">
            Votre adresse email a déjà été confirmée
          </p>
        </div>

        {/* Contenu principal */}
        <div className="p-8 text-center">
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">
              Votre compte est déjà activé et prêt à être utilisé. Vous pouvez vous connecter dès maintenant pour accéder à toutes les fonctionnalités de Trouve Ton Nkama.
            </p>
            
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center text-green-700 dark:text-green-300">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Compte vérifié et actif</span>
              </div>
            </div>

            <div className="text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Que pouvez-vous faire maintenant ?
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Rechercher des propriétés dans tout le Gabon
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Publier vos annonces immobilières
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Sauvegarder vos propriétés favorites
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Configurer des alertes personnalisées
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Utiliser vos crédits gratuits
                </li>
              </ul>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={routes.public.signin}>
              <Button className="w-full sm:w-auto bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#0f5853] hover:to-[#1a9688] text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg">
                Se connecter
              </Button>
            </Link>
            
            <Link href={routes.public.homePage}>
              <Button variant="outline" className="w-full sm:w-auto border-[#146B67] text-[#146B67] hover:bg-[#146B67] hover:text-white px-8 py-3 rounded-lg transition-all duration-200">
                Retour à l'accueil
              </Button>
            </Link>
          </div>

          {/* Message d'aide */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vous rencontrez des difficultés ? Contactez notre support à{' '}
              <a href={`mailto:${supportContact.email}`} className="text-[#146B67] hover:text-[#1FA89B] font-medium">
                {supportContact.email}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailAlreadyVerified 