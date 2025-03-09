'use client'
import React from 'react'
import { Search, Heart, UserCircle, House, Bell } from "lucide-react";
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useCurrentUser } from '@/hooks/use-current-user';

const menu = [
    {
        title: 'Logements',
        icon: House,
        link: routes.protected.properties
    },
    {
        title: 'Favoris',
        icon: Heart,
        link: routes.protected.favoris
    },
    {
        title: 'Explorer',
        icon: Search,
        link: routes.public.homePage
    },
    {
        title: 'Notification',
        icon: Bell,
        link: routes.protected.notifications
    },
    {
        title: 'Profil',
        icon: UserCircle,
        link: '/profil'
    },
]
export const BottomNavigation: React.FC = () => {
    const pathnames = usePathname()
    const user = useCurrentUser()
    if(!user){
        return null
    }
    return (
        <div className='fixed bottom-0 z-50 w-full flex bg-white p-4 justify-between md:hidden shadow border-t'>
            {
                menu.map((item, key) => (
                    <Link href={item.link} key={key} className={clsx({
                        'text-xs flex flex-col items-center text-[#846CF9]': pathnames === item.link,
                        'text-xs flex flex-col items-center': pathnames !== item.link,
                    })}>
                        <item.icon size={25} />
                        {/* <span>{item.title}</span> */}
                    </Link>
                ))
            }
        </div>
    )
}
