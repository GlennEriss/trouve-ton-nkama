import React from 'react'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import { routes } from '@/constantes/routes'

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})

export default function PrivacyPolicyMobile() {
    return (
        <div className={cn('', inter.className)}>
            <div className='sticky top-0 border-t border px-5 py-10 bg-white dark:bg-gray-900 dark:border-gray-700'>
                <h1 className='text-2xl font-bold text-[#494949] dark:text-white'>Politique de confidentialité</h1>
                <span className='text-gray-500 dark:text-gray-400'>Dernière mise à jour le 28 avril 2025</span>
            </div>
            <div className='p-5 pb-28'>
                <h2 className="text-xl font-semibold text-[#494949] dark:text-white mt-4">Introduction</h2>
                <p className="text-gray-700 dark:text-gray-300 text-md leading-relaxed">
                    Bienvenue sur LogisGabon, votre plateforme de publication d'annonces de logements à louer.
                    Nous nous engageons à protéger votre vie privée et à assurer la transparence quant à la collecte,
                    l'utilisation et la protection de vos données personnelles.
                </p>
                <h2 className="text-xl font-semibold text-[#494949] dark:text-white mt-4">1. Données collectées</h2>
                <p className="text-gray-700 dark:text-gray-300 text-md leading-relaxed mt-2">
                    Nous collectons les informations suivantes lorsque vous utilisez notre site :
                </p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-md">
                    <li>Nom et prénom</li>
                    <li>Adresse e-mail</li>
                    <li>Numéro de téléphone</li>
                    <li>Photos et descriptions des annonces postées</li>
                    <li>Données de connexion (adresse IP, appareil utilisé, navigateur)</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 text-md leading-relaxed mt-2">
                    Pour exercer ces droits, vous pouvez également consulter notre page dédiée à la{" "}
                    <a href={routes.public.data_deletion} className="text-[#1FA89B] underline">
                        suppression des données
                    </a>.
                </p>

                <h2 className="text-xl font-semibold text-[#494949] dark:text-white mt-6">2. Utilisation des données</h2>
                <p className="text-gray-700 dark:text-gray-300 text-md leading-relaxed mt-2">
                    Nous utilisons vos informations pour :
                </p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-md">
                    <li>Publier et gérer vos annonces</li>
                    <li>Améliorer l'expérience utilisateur</li>
                    <li>Vous notifier en cas de mise à jour ou modification</li>
                    <li>Respecter les obligations légales en vigueur au Gabon</li>
                </ul>

                <h2 className="text-xl font-semibold text-[#494949] dark:text-white mt-6">3. Partage des données</h2>
                <p className="text-gray-700 dark:text-gray-300 text-md leading-relaxed mt-2">
                    Nous ne partageons pas vos données avec des tiers, sauf dans les cas suivants :
                </p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-md">
                    <li>Obligation légale ou demande des autorités gabonaises</li>
                    <li>Partenaires techniques nécessaires au fonctionnement du site</li>
                </ul>

                <h2 className="text-xl font-semibold text-[#494949] dark:text-white mt-6">4. Sécurité des données</h2>
                <p className="text-gray-700 dark:text-gray-300 text-md leading-relaxed mt-2">
                    Nous mettons en place des mesures de sécurité avancées pour protéger vos données contre tout accès non autorisé.
                </p>

                <h2 className="text-xl font-semibold text-[#494949] dark:text-white mt-6">5. Vos droits</h2>
                <p className="text-gray-700 dark:text-gray-300 text-md leading-relaxed mt-2">
                    Conformément aux lois gabonaises, vous avez le droit de :
                </p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-md">
                    <li>Accéder à vos données</li>
                    <li>Demander la suppression ou modification de vos informations</li>
                    <li>Vous opposer à l’utilisation de vos données</li>
                </ul>

                <h2 className="text-xl font-semibold text-[#494949] dark:text-white mt-6">6. Contact</h2>
                <p className="text-gray-700 dark:text-gray-300 text-md leading-relaxed mt-2">
                    Pour toute question concernant cette politique, veuillez nous contacter à :
                    <span className="font-medium text-[#1FA89B]"> {process.env.NEXT_PUBLIC_EMAIL_SUPPORT}</span>.
                </p>
            </div>
        </div>
    )
}
