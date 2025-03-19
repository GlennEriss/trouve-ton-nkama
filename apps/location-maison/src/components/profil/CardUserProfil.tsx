'use client'
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateColorFromName } from '@/lib/generateColorFromName';
import { useCurrentUser } from '@/hooks/use-current-user';
import { firebaseTimestampToDate } from '@/lib/firebaseTimestampToDate';

export default function CardUserProfil() {
    const { user } = useCurrentUser()
    const avatarBackground = generateColorFromName(user?.firstname)
    console.log(user?.createdAt?.nanoseconds)
    return (
        <Card className="shadow-lg border border-gray-200 md:flex md:items-center md:max-w-[550px] lg:flex-col lg:mt-7">
            {/* Header de la carte */}
            <CardHeader>
                <div className='flex flex-col items-center gap-2 md:flex-row md:gap-4 lg:flex-col'>
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
                    <div className='flex flex-col items-center md:items-start lg:items-center' >
                        <CardTitle className='text-center md:text-start text-xl'>{`${user?.firstname} ${user?.lastname}`}</CardTitle>
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
            <CardContent className="flex flex-col gap-1 text-center md:text-start md:gap-0 md:mt-5 lg:mt-0">
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
                        user?.phoneNumbers.map((phone, index) => <span key={index}>{phone}</span>)
                    ) : (
                        <span>Aucun numéro de téléphone disponible</span>
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