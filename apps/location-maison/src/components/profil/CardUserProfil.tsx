'use client'
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@trouve-ton-nkama/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@trouve-ton-nkama/ui/avatar';
import { generateColorFromName } from '@/lib/generateColorFromName';
import { useCurrentUser } from '@/hooks/use-current-user';
import { firebaseTimestampToDate } from '@/lib/firebaseTimestampToDate';
import { useWindowSize } from '@/hooks/useSize';
import { Separator } from '@trouve-ton-nkama/ui/separator';

export default function CardUserProfil() {
    const { user } = useCurrentUser()
    const avatarBackground = generateColorFromName(user?.firstname)
    const size = useWindowSize()
    if (size.width < 768) {
        return (
            <div className='flex flex-col items-center gap-3'>
                <Avatar
                    className='w-[80px] h-[80px] mt-5'
                >
                    <AvatarImage src={user?.image ?? ''} alt="@shadcn" />
                    <AvatarFallback
                        style={{ backgroundColor: avatarBackground }}
                        className='text-2xl font-bold text-white'>
                        {user?.firstname?.at(0)}
                    </AvatarFallback>
                </Avatar>
                <div className='flex flex-col items-center'>
                    <h1 className='font-bold text-xl'>
                        {user?.firstname} {user?.lastname}
                    </h1>
                    <span className='text-gray-500'>
                        {user?.email}
                    </span>
                </div>
                <Separator className='mt-6'/>
            </div>
        )
    }
    return (
        <Card className="shadow-lg border border-gray-200 md:flex md:items-center md:max-w-[550px] lg:flex-col lg:mt-7">
            {/* Header de la carte */}
            <CardHeader>
                <div className='flex flex-col items-center gap-2 md:gap-4'>
                    <Avatar
                        className='w-[80px] h-[80px]'
                    >
                        <AvatarImage src={user?.image ?? ''} alt="@shadcn" />
                        <AvatarFallback
                            style={{ backgroundColor: avatarBackground }}
                            className='text-2xl font-bold text-white'>
                            {user?.firstname?.at(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className='flex flex-col items-center' >
                        <CardTitle className='text-center md:text-start text-xl'>{`${user?.firstname}`}</CardTitle>
                        <CardTitle className='text-center md:text-start text-lg text-gray-500'>{`${user?.lastname}`}</CardTitle>
                        <CardDescription className="text-sm text-gray-500 flex flex-col">
                            <span>Depuis le: {firebaseTimestampToDate(user?.createdAt?.seconds, user?.createdAt?.nanoseconds)?.toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                            })}</span>
                            <span>Modifié le: {firebaseTimestampToDate(user?.updatedAt?.seconds, user?.updatedAt?.nanoseconds)?.toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                            })}</span>
                            <span className='md:hidden'>{user?.email}</span>
                        </CardDescription>
                    </div>
                </div>

            </CardHeader>

            {/* Contenu principal */}
            <CardContent className="xl:flex flex-col gap-1 text-center md:text-start md:gap-0 md:mt-5 lg:mt-0 hidden">
                {
                    user?.country && (
                        <div className='text-sm'>
                            <strong>Pays:</strong> {user?.country?.name} ({user?.country?.code})
                        </div>
                    )
                }
                <div className='text-sm space-x-1'>
                    <strong>Téléphone:</strong>
                    {user?.phoneNumbers && user?.phoneNumbers.length > 0 ? (
                        user?.phoneNumbers.map((phone: string) => <span key={phone}>{phone}</span>)
                    ) : (
                        <span>Indisponible</span>
                    )}
                </div>
                <div className='hidden md:flex text-sm gap-1'>
                    <strong>Email:</strong>
                    <span className=''>{user?.email}</span>
                </div>
            </CardContent>
        </Card>
    );
}