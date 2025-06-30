import React from 'react'
import { cn } from '@/lib/utils'
import { routes } from '@/constantes/routes'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})
export default function TermsOfUseMobilePage() {
    return (
        <div className={cn('', inter.className)}>
            <div className='sticky top-0 border-t border px-5 py-10 bg-white dark:bg-gray-900 dark:border-gray-700'>
                <h1 className='text-2xl font-bold text-[#494949] dark:text-white'>Conditions d&apos;Utilisation</h1>
                <span className='text-gray-500 dark:text-gray-400'>Dernière mise à jour le 28 avril 2025</span>
            </div>
            <div className='p-5 pb-28'>
                <section id="introduction" className="mb-6">
                    <h2 className="text-xl font-semibold mb-2 text-[#494949] dark:text-white">1. Introduction</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        Bienvenue sur <strong className='text-[#1FA89B]'>LogisGabon</strong>. En accédant et en utilisant notre plateforme, vous acceptez nos conditions d&apos;utilisation.
                    </p>
                </section>

                <section id="utilisation" className="mb-6">
                    <h2 className="text-xl font-semibold mb-2 text-[#494949] dark:text-white">2. Utilisation de la plateforme</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        LogisGabon est une plateforme permettant aux utilisateurs de publier et consulter des annonces de location immobilière. Les utilisateurs doivent être âgés d'au moins 18 ans pour créer un compte sur notre plateforme. L&apos;utilisation du site doit être conforme aux lois en vigueur et aux règles éthiques de la communauté.
                    </p>
                </section>

                <section id="contenu" className="mb-6">
                    <h2 className="text-xl font-semibold mb-2 text-[#494949] dark:text-white">3. Contenu et responsabilité</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        Chaque utilisateur est responsable du contenu qu&apos;il publie sur LogisGabon. Les annonces ne doivent contenir ni informations
                        trompeuses ni contenu illégal.
                    </p>
                </section>

                <section id="confidentialite" className="mb-6">
                    <h2 className="text-xl font-semibold mb-2 text-[#494949] dark:text-white">4. Confidentialité et protection des données</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        La protection de vos données est notre priorité. Nous collectons et utilisons vos informations conformément à notre
                        <Link href={routes.public.confidentiality} className="text-[#1FA89B] underline"> Politique de Confidentialité</Link>.
                    </p>
                </section>

                <section id="modifications" className="mb-6">
                    <h2 className="text-xl font-semibold mb-2 text-[#494949] dark:text-white">5. Modifications des conditions</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés des changements importants.
                    </p>
                </section>

                <section id="contact" className="mb-6">
                    <h2 className="text-xl font-semibold mb-2 text-[#494949] dark:text-white">6. Contact</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        Pour toute question relative à ces conditions, vous pouvez nous contacter à :
                        {" "}
                        <a href={`mailto:${process.env.NEXT_PUBLIC_EMAIL_SUPPORT}`} className="text-[#1FA89B] hover:underline"> {process.env.NEXT_PUBLIC_EMAIL_SUPPORT}</a>.
                    </p>
                </section>
            </div>
        </div>
    )
}
