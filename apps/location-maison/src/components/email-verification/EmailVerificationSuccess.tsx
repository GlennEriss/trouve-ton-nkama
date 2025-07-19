'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { routes } from '@/constantes/routes'
import Logo from '@/components/logo/Logo'
import { CheckCircle2, CreditCard, Bell, Heart } from 'lucide-react'
import { supportContact } from "@/constantes";

const EmailVerificationSuccess: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center py-5">
      {/* Container */}
      <div className="w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg overflow-hidden">
        
        {/* Header avec gradient et animation */}
        <div className="bg-gradient-to-br from-[#146B67] via-[#1FA89B] to-[#146B67] text-white p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Link href={routes.public.homePage}>
              <Logo width="64px" height="64px" />
            </Link>
            <h1 className="text-2xl font-bold ml-3">
              Trouve Ton Nkama
            </h1>
          </div>
          <div className="text-6xl mb-4 animate-bounce">
            <CheckCircle2 className="w-16 h-16 mx-auto text-yellow-300" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            Félicitations !
          </h2>
          <p className="text-lg opacity-90">
            Votre email a été vérifié avec succès
          </p>
        </div>

        {/* Contenu principal */}
        <div className="p-8 text-center">
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-6">
              Votre compte est maintenant activé ! Vous pouvez profiter de toutes les fonctionnalités de Trouve Ton Nkama pour trouver votre logement idéal au Gabon.
            </p>
            
            {/* Badge de succès */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center text-green-700 dark:text-green-300 mb-3">
                <svg className="w-8 h-8 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xl font-bold">Compte activé !</span>
              </div>
              <p className="text-green-600 dark:text-green-400 font-medium">
                Vous avez reçu 3 crédits gratuits pour commencer
              </p>
            </div>

            {/* Prochaines étapes */}
            <div className="text-left bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6">
              <h3 className="font-bold text-[#146B67] dark:text-[#1FA89B] text-lg mb-4 text-center">
                Prochaines étapes
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#146B67] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Connectez-vous</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Accédez à votre espace personnel</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#1FA89B] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Complétez votre profil</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Pour des recommandations personnalisées</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#146B67] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Explorez les annonces</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Découvrez les propriétés disponibles</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#1FA89B] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Publiez vos biens</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Mettez en ligne vos propriétés</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Avantages */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 text-center">
                Vos avantages
              </h3>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-2xl mb-1">
                    <CreditCard className="w-8 h-8 mx-auto text-[#146B67]" />
                  </div>
                  <div className="font-medium text-[#146B67] dark:text-[#1FA89B]">3 crédits</div>
                  <div className="text-gray-600 dark:text-gray-400">gratuits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">
                    <Bell className="w-8 h-8 mx-auto text-[#146B67]" />
                  </div>
                  <div className="font-medium text-[#146B67] dark:text-[#1FA89B]">Alertes</div>
                  <div className="text-gray-600 dark:text-gray-400">personnalisées</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">
                    <Heart className="w-8 h-8 mx-auto text-[#146B67]" />
                  </div>
                  <div className="font-medium text-[#146B67] dark:text-[#1FA89B]">Favoris</div>
                  <div className="text-gray-600 dark:text-gray-400">illimités</div>
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={routes.public.signin}>
              <Button className="w-full sm:w-auto bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#0f5853] hover:to-[#1a9688] text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg">
                Commencer maintenant
              </Button>
            </Link>
            
            <Link href={routes.public.search}>
              <Button variant="outline" className="w-full sm:w-auto border-[#146B67] text-[#146B67] hover:bg-[#146B67] hover:text-white px-8 py-3 rounded-lg transition-all duration-200">
                Découvrir les annonces
              </Button>
            </Link>
          </div>

          {/* Message d'aide */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Besoin d'aide pour commencer ? Consultez notre{' '}
              <a href="/aide" className="text-[#146B67] hover:text-[#1FA89B] font-medium">
                guide d'utilisation
              </a>
              {' '}ou contactez-nous à{' '}
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

export default EmailVerificationSuccess 