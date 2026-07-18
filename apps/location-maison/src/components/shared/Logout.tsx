'use client'
import React from 'react'
import { Button } from '../ui/button'
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { routes } from '@/constantes/routes';
import { signOut } from "next-auth/react"
import { LogOut } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('components.logout');

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
            logger.error('Logout failed', { error });
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
            <Button 
                onClick={handleClientSignout} 
                variant='outline' 
                className='min-h-11 w-full text-md border-red-600 text-red-700 hover:text-red-800 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-950/30 transition-colors'
                disabled={isLoading}
            >
                <LogOut className="mr-2" size={20} />
                {
                    isLoading ? (
                        <div className="w-5 h-5 border-2 border-red-500 rounded-full animate-spin border-t-transparent"></div>
                    ) : (
                        <span>Se déconnecter</span>
                    )
                }
            </Button>
        </div>
    )
}
