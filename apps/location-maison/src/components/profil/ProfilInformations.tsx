'use client'
import { useCurrentUser } from '@/hooks/use-current-user'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { generateColorFromName } from '@/lib/generateColorFromName';
import { routes } from '@/constantes/routes';

export default function ProfilInformations() {
    const { user } = useCurrentUser()
    const avatarBackground = generateColorFromName(user?.firstname);
    return (
        <Link href={routes.protected.profil_informations} className='flex min-h-20 items-center gap-5 rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-gray-700 dark:bg-gray-900'>
            <Avatar
                className='w-[50px] h-[50px]'
            >
                <AvatarImage src={user?.image ?? ''} alt={user?.firstname} />
                <AvatarFallback
                    style={{ backgroundColor: avatarBackground }}
                    className='text-2xl font-bold text-white'>
                    {user?.firstname?.at(0) ?? ''}
                </AvatarFallback>
            </Avatar>
            <div className='flex flex-col'>
                <p className='flex gap-1'>
                    <span className='text-xl'>{user?.firstname}</span>
                    <span className='text-xl hidden md:block'>{user?.lastname}</span>
                </p>

                <span className='text-sm text-gray-600 dark:text-gray-300'>Modifier mes informations</span>
            </div>
            <ChevronRight className='ml-auto' size={24} />
        </Link>
    )
}
