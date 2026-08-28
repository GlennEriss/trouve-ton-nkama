'use client'
import React from 'react'
import { Button } from '@trouve-ton-nkama/ui/button'
import { LogOut } from 'lucide-react';
import { useSignOut } from '@/features/auth/hooks';

export default function Logout() {
    const { signOut, isSigningOut } = useSignOut();

    return (
        <div className='md:hidden'>
            <Button
                onClick={signOut}
                variant='outline'
                className='min-h-11 w-full text-md border-red-600 text-red-700 hover:text-red-800 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-950/30 transition-colors'
                disabled={isSigningOut}
            >
                <LogOut className="mr-2" size={20} />
                {
                    isSigningOut ? (
                        <div className="w-5 h-5 border-2 border-red-500 rounded-full animate-spin border-t-transparent"></div>
                    ) : (
                        <span>Se déconnecter</span>
                    )
                }
            </Button>
        </div>
    )
}
