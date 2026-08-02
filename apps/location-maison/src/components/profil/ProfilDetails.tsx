'use client'
import React from 'react'
import { ChevronRight, Lock, Settings, ShieldCheck, FileText, Coins, Phone, Building2, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { useWindowSize } from '@/hooks/useSize';
import { routes } from '@/constantes/routes';
import { useCurrentUser } from '@/hooks/use-current-user';

const baseMenu = [
    {
        title: 'Faire de la pub',
        icon: Megaphone,
        link: routes.protected.advertising,
        description: 'Créez une publicité pour votre entreprise et payez en crédits. Diffusion immédiate sur la plateforme.'
    },
    {
        title: 'Mon solde',
        icon: Coins,
        link: routes.protected.my_balance,
        description: 'Accédez aux pages dédiées pour consulter votre historique de crédits et gérer la recharge manuelle de votre compte.'
    },
    {
        title: 'Vérifier mon numéro de téléphone',
        icon: Phone,
        link: routes.protected.verify_phone,
        description: 'Vérifiez votre numéro de téléphone en recevant un code de confirmation par SMS pour sécuriser votre compte.'
    },
    {
        title: 'Paramètre',
        icon: Settings,
        link: routes.protected.notifications,
        description: 'Personnalisez vos préférences de notification pour rester informé tout en évitant les distractions inutiles.'
    },
    {
        title: 'Connexion et sécurité',
        icon: Lock,
        link: routes.protected.login_and_security,
        description: 'Gérez vos informations de connexion, réinitialisez votre mot de passe et configurez les options de sécurité pour protéger votre compte.'
    },
    {
        title: 'Politique de confidentialité',
        icon: ShieldCheck,
        link: routes.public.confidentiality,
        description: 'Consultez comment vos données personnelles sont collectées, utilisées et protégées conformément à nos politiques.'
    },
    {
        title: "Condition d'utilisations",
        icon: FileText,
        link: routes.public.terms_of_use,
        description: "Prenez connaissance de nos règles et engagements qui encadrent l'utilisation de notre plateforme afin de garantir une expérience sécurisée et équitable pour tous."
    },
    /* {
        title: 'Signaler un problème',
        icon: HelpCircle,
        link: '',
        description: 'Contactez l'assistance ou signalez un bug pour nous aider à améliorer votre expérience.'
    }, */
];

export default function ProfilDetails() {
    const size = useWindowSize()
    const { user } = useCurrentUser();
    const isAnnouncer = Array.isArray(user?.roles) && user.roles.includes('Announcer');

    const menu = [
        ...(!isAnnouncer ? [{
            title: 'Devenir annonceur',
            icon: Building2,
            link: routes.protected.become_announcer,
            description: 'Activez le rôle annonceur pour publier des annonces tout en conservant les droits utilisateur.'
        }] : []),
        ...baseMenu,
    ];

    return size.width < 768 ? (
        <div className='divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white px-4 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900'>
            {
                menu.map((item) => (
                    <div key={item.title}>
                        <Link href={item.link} className='flex min-h-14 items-center gap-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className='ml-auto' size={24} />
                        </Link>
                    </div>
                ))
            }
        </div>
    ) : (
        <div className='grid gap-3 lg:grid-cols-2'>
            {
                menu.map((item) => (
                    <Link href={item.link} key={item.title} className='min-h-36 border border-gray-200 bg-white p-5 space-y-3 rounded-lg shadow-sm transition-colors hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-gray-700 dark:bg-gray-900'>
                        <div className='flex gap-3 items-center'>
                            <item.icon size={30} />
                            <h2 className='font-bold text-xl'>{item.title}</h2>
                        </div>
                        <p className='text-gray-600 dark:text-gray-300'>
                            {item.description}
                        </p>
                    </Link>
                ))
            }
        </div>
    )
}
