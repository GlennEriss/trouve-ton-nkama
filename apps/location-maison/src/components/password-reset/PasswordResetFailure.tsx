'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { routes } from '@/constantes/routes'
import Logo from '@/components/logo/Logo'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { supportContact } from "@/constantes";

const PasswordResetFailure: React.FC = () => {
  const router = useRouter()

  const redirectToLogin = () => {
    router.push(routes.public.signin)
  }

  const redirectToResetRequest = () => {
    router.push(routes.public.passwordResetRequest)
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center py-5">
      {/* Container */}
      <div className="w-full max-w-lg mx-4 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg overflow-hidden">
        
        {/* Header avec gradient */}
        <div className="bg-gradient-to-br from-red-600 via-red-500 to-red-600 text-white p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Link href={routes.public.homePage}>
              <Logo width="64px" height="64px" />
            </Link>
            <h1 className="text-2xl font-bold ml-3">
              Trouve Ton Nkama
            </h1>
          </div>
          <div className="text-6xl mb-4">
            <XCircle className="w-16 h-16 mx-auto text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            Réinitialisation échouée
          </h2>
          <p className="text-lg opacity-90">
            Le lien de réinitialisation n'est plus valide
          </p>
        </div>

        {/* Contenu principal */}
        <div className="p-8 text-center">
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-6">
              Le lien de réinitialisation de mot de passe que vous avez utilisé a expiré ou est invalide.
            </p>
            
            {/* Raisons possibles */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-red-700 dark:text-red-300 mb-3">
                Raisons possibles :
              </h3>
              <ul className="text-left text-red-600 dark:text-red-400 space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-2"></span>
                  Le lien a expiré (valide pendant 24h uniquement)
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-2"></span>
                  Le lien a déjà été utilisé
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-2"></span>
                  L'URL est incomplète ou incorrecte
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-2"></span>
                  Votre compte a été modifié entre temps
                </li>
              </ul>
            </div>

            {/* Solutions */}
            <div className="text-left bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3 text-center">
                Solutions recommandées
              </h3>
              <ol className="text-blue-600 dark:text-blue-400 space-y-3 text-sm">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                    1
                  </span>
                  <div>
                    <div className="font-medium">Demander un nouveau lien</div>
                    <div className="text-xs">Générer un nouveau lien de réinitialisation</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                    2
                  </span>
                  <div>
                    <div className="font-medium">Vérifier votre email</div>
                    <div className="text-xs">Consultez votre boîte de réception pour un email plus récent</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                    3
                  </span>
                  <div>
                    <div className="font-medium">Essayer de vous connecter</div>
                    <div className="text-xs">Votre mot de passe n'a peut-être pas changé</div>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col gap-4">
            <Button
              onClick={redirectToResetRequest}
              className="w-full bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#0f5853] hover:to-[#1a9688] text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg"
            >
              Demander un nouveau lien
            </Button>
            
            <Button
              variant="outline"
              onClick={redirectToLogin}
              className="w-full border-[#146B67] text-[#146B67] hover:bg-[#146B67] hover:text-white px-8 py-3 rounded-lg transition-all duration-200"
            >
              Essayer de me connecter
            </Button>
            
            <Link href={routes.public.homePage}>
              <Button
                variant="ghost"
                className="w-full text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Retour à l'accueil
              </Button>
            </Link>
          </div>

          {/* Message d'aide */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                Besoin d'aide supplémentaire ?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Si vous continuez à rencontrer des difficultés, notre équipe support est là pour vous aider.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 text-sm">
                <a 
                  href={`mailto:${supportContact.email}`} 
                  className="text-[#146B67] hover:text-[#1FA89B] font-medium"
                >
                  {supportContact.email}
                </a>
                <span className="hidden sm:inline text-gray-400">•</span>
                <a 
                  href="tel:+24101020304" 
                  className="text-[#146B67] hover:text-[#1FA89B] font-medium"
                >
                  +241 01 02 03 04
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PasswordResetFailure 