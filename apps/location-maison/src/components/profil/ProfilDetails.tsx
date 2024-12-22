import React from 'react'
import { ChevronRight, Lock, HelpCircle, Bell, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const menu = [
    {
        title: 'Connexion et sécurité',
        icon: Lock,
        link: ''
    },
    {
        title: 'Notifications',
        icon: Bell,
        link: ''
    },
    {
        title: 'Politique de confidentialité',
        icon: ShieldCheck,
        link: ''
    },
    {
        title: 'Signaler un problème',
        icon: HelpCircle,
        link: ''
    },
]
export default function ProfilDetails() {
    return (
        <div className='space-y-5'>
            {
                menu.map((item, index) => (
                    <Link href={item.link} key={index} className='flex items-center gap-3'>
                        <item.icon/>
                        <span>{item.title}</span>
                        <ChevronRight className='ml-auto' size={24} />
                    </Link>
                ))
            }
        </div>
    )
}
