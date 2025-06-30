'use client'
import React from 'react'
import { Button } from '../ui/button'
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { routes } from '@/constantes/routes';
import { signOut } from "next-auth/react"

const getAuth = () => import("@/firebase/auth");

export default function Logout() {
    const { toast } = useToast();
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(false)
    const handleClientSignout = async () => {
        setIsLoading(true)
        try {
            const { auth, signOut: firebaseSignOut } = await getAuth();
            await firebaseSignOut(auth);
            await signOut();
            toast({
                duration: 5000,
                title: "Déconnexion",
                description: "Vous vous êtes déconnectés de la plateforme",
                variant: "warning",
            });
            setIsLoading(false)
            router.push(routes.public.homePage)
        } catch (error) {
            console.error('Erreur lors de la déconnexion :', error);
            setIsLoading(false)
            toast({
                duration: 5000,
                title: "Erreur de déconnexion",
                description: "Une erreur est survenue lors de la déconnexion.",
                variant: "destructive",
            });
        }
    }
    return (
        <div className='md:hidden'>
            <Button onClick={handleClientSignout} variant='outline' className='w-full text-md border-red-500 text-red-500 hover:text-red-500'>
                {
                    isLoading ? (
                        <div className="w-5 h-5 border-4 border-red-500 rounded-full animate-spin border-t-transparent"></div>
                    ) : (
                        <span>Se déconnecter</span>
                    )
                }
            </Button>
        </div>
    )
}
