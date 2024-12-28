'use client'
import React from 'react'
import { ChevronRight, Lock, HelpCircle, Bell, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useWindowSize } from '@/hooks/useSize';
import { routes } from '@/constantes/routes';

const menu = [
    {
        title: 'Connexion et sécurité',
        icon: Lock,
        link: routes.protected.login_and_security,
        description: 'Gérez vos informations de connexion, réinitialisez votre mot de passe et configurez les options de sécurité pour protéger votre compte.'
    },
    {
        title: 'Notifications',
        icon: Bell,
        link: '',
        description: 'Personnalisez vos préférences de notification pour rester informé tout en évitant les distractions inutiles.'
    },
    {
        title: 'Politique de confidentialité',
        icon: ShieldCheck,
        link: '',
        description: 'Consultez comment vos données personnelles sont collectées, utilisées et protégées conformément à nos politiques.'
    },
    {
        title: 'Signaler un problème',
        icon: HelpCircle,
        link: '',
        description: 'Contactez l’assistance ou signalez un bug pour nous aider à améliorer votre expérience.'
    },
];
export default function ProfilDetails() {
    const size = useWindowSize()
    return size.width < 768 ? (
        <div className='space-y-5'>
            {
                menu.map((item, index) => (
                    <Link href={item.link} key={index} className='flex items-center gap-3'>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRight className='ml-auto' size={24} />
                    </Link>
                ))
            }
        </div>
    ) : (
        <div className='grid gap-3 lg:grid-cols-2'>
            {
                menu.map((item, index) => (
                    <Link href={item.link} key={index} className='border p-5 space-y-3 rounded-xl shadow'>
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
