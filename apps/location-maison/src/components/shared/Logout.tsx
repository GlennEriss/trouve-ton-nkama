'use client'
import React, { useTransition } from 'react'
import { Button } from '../ui/button'
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signout } from '@/actions/signout';
import { routes } from '@/constantes/routes';

export default function Logout() {
    const { toast } = useToast();
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const handleSignout = () => {
        startTransition(async () => {
            const isSignout = await signout()
            if (isSignout) {
                toast({
                    title: "Déconnexion",
                    description: "Vous vous êtes déconnectés de la plateforme",
                    variant: "warning",
                });
                router.push(routes.public.homePage)
            } else {
                toast({
                    title: "Déconnexion",
                    description: "Une erreur est survenue durant la déconnexion.",
                    variant: "destructive",
                });
            }
        })
    }
    return (
        <div className='md:hidden'>
            <Button onClick={handleSignout} variant='outline' className='w-full text-md border-red-500 text-red-500 hover:text-white'>
                {
                    isPending ? (
                        <div className="w-5 h-5 border-4 border-red-500 rounded-full animate-spin border-t-transparent"></div>
                    ) : (
                        <span>Se déconnecter</span>
                    )
                }
            </Button>
        </div>
    )
}
