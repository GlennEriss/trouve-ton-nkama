'use client'
import { useCurrentUser } from '@/hooks/use-current-user'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { generateColorFromName } from '@/lib/generateColorFromName';

export default function ProfilInformations() {
    const user = useCurrentUser()
    const avatarBackground = generateColorFromName(user?.firstname);
    return (
        <Link href='' className='flex items-center gap-5 border rounded-lg p-5'>
            <Avatar
                className='w-[50px] h-[50px]'
            >
                <AvatarImage src={user?.image ?? ''} alt="@shadcn" />
                <AvatarFallback
                    style={{ backgroundColor: avatarBackground }}
                    className='text-2xl font-bold text-white'>
                    {user?.firstname.at(0)}
                </AvatarFallback>
            </Avatar>
            <div className='flex flex-col'>
                <p className='flex gap-1'>
                    <span className='text-xl'>{user?.firstname}</span>
                    <span className='text-xl hidden md:block'>{user?.lastname}</span>
                </p>

                <span className='text-xs text-gray-500'>Voir son profil</span>
            </div>
            <ChevronRight className='ml-auto' size={24} />
        </Link>
    )
}
