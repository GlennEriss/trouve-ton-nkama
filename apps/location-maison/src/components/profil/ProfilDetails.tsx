'use client'
import React from 'react'
import { ChevronRight, Lock, Settings, ShieldCheck, FileText, Coins, Phone } from 'lucide-react';
import Link from 'next/link';
import { useWindowSize } from '@/hooks/useSize';
import { routes } from '@/constantes/routes';
import { Separator } from '../ui/separator';

const menu = [
    {
        title: 'Mon solde',
        icon: Coins,
        link: routes.protected.my_balance,
        description: 'Consultez votre solde de crédits, rechargez votre compte et accédez à l\'historique de vos transactions pour utiliser nos services premium.'
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

    return size.width < 768 ? (
        <div className='space-y-5'>
            {
                menu.map((item) => (
                    <div key={item.title} className='flex flex-col gap-5'>
                        <Link href={item.link} className='flex items-center gap-3'>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className='ml-auto' size={24} />
                        </Link>
                        <Separator className='md:hidden' />
                    </div>
                ))
            }
        </div>
    ) : (
        <div className='grid gap-3 lg:grid-cols-2'>
            {
                menu.map((item) => (
                    <Link href={item.link} key={item.title} className='border p-5 space-y-3 rounded-xl shadow'>
                        <div className='flex gap-3 items-center'>
                            <item.icon size={30} />
                            <h1 className='font-bold text-xl'>{item.title}</h1>
                        </div>
                        <p className='text-gray-500'>
                            {item.description}
                        </p>
                    </Link>
                ))
            }
        </div>
    )
}
