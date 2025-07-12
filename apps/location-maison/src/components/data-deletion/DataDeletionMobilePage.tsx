import { routes } from '@/constantes/routes'
import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import React from 'react'

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})
export default function DataDeletionMobilePage() {
    return (
        <div className={cn('', inter.className)}>
            <div className='sticky top-0 border-t border px-5 py-10 bg-white dark:bg-gray-900 dark:border-gray-700'>
                <h1 className='text-2xl font-bold text-[#494949] dark:text-white'>Suppression des Données</h1>
                <span className='text-gray-500 dark:text-gray-400'>Dernière mise à jour le 28 avril 2025</span>
            </div>
            <div className='p-5 pb-28'>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                    Conformément à la politique de protection des données, vous avez le droit de demander la suppression de vos données personnelles associées à votre compte.
                </p>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                    Si vous souhaitez supprimer vos données de notre plateforme, veuillez nous contacter par email à l'adresse suivante :{" "}
                    <strong className='text-[#1FA89B]'>{process.env.NEXT_PUBLIC_EMAIL_SUPPORT}</strong> en mentionnant l'objet « Suppression de compte ».
                </p>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                    Une fois votre demande reçue, nous traiterons la suppression de vos données dans un délai de 30 jours, conformément à nos conditions d'utilisation et notre politique de confidentialité.
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                    Pour plus d'informations, consultez notre{" "}
                    <Link href={routes.public.confidentiality} className="text-[#1FA89B] underline">
                        Politique de Confidentialité
                    </Link>.
                </p>
            </div>
        </div>
    )
}
