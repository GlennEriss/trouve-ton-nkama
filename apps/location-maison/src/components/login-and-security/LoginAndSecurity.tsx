'use client'
import React from 'react'
import { Separator } from '@/components/ui/separator';
import connectionMethods from '@/constantes/connections-methods';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { signInWithGoogle } from '@/actions/signin-with-google';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ProviderType } from '@/models/authentication';
import { signInWithFacebook } from '@/actions/signin-with-facebook';

export default function LoginAndSecurity() {
    const user = useCurrentUser()
    const [isPending, startTransition] = React.useTransition()
    const handleConnection = (method: 'FACEBOOK' | 'GOOGLE') => {
        switch (method) {
            case 'GOOGLE':
                startTransition(() => {
                    signInWithGoogle();
                })
                break;
            case 'FACEBOOK':
                startTransition(() => {
                    signInWithFacebook()
                })
                break;
            default:
                break;
        }
    }
    return (
        <div className='px-6'>
            <h1 className='text-xl font-bold'>Réseaux sociaux</h1>
            <Separator className='my-4' />
            <div>
                {
                    connectionMethods.map((connection, key) => (
                        <div key={key} className=''>
                            <div className='flex items-center justify-between'>
                                <div
                                    className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition duration-200"
                                >
                                    <connection.icon size={24} />
                                </div>
                                <div>
                                    {
                                        user?.providers?.includes(connection.method as ProviderType) ? (
                                            <span className='text-green-500 font-bold'>Connecté</span>
                                        ) : (
                                            <span className='text-red-500 font-bold'>Non connecté</span>
                                        )
                                    }
                                </div>
                                <Button
                                    type='button'
                                    onClick={() => handleConnection(connection.method)}
                                    disabled={user?.providers?.includes(connection.method as ProviderType)}
                                >
                                    Se connecter
                                </Button>
                            </div>
                            <Separator className='my-4' />
                        </div>
                    ))
                }
            </div>
            <div className='space-y-2'>
                <h1 className='text-xl font-bold'>Modifier le mot de passe</h1>
                <Button variant='outline' asChild>
                    <Link href={routes.public.reset_password}>
                        Mettre à jour
                    </Link>
                </Button>
            </div>
        </div>
    )
}
