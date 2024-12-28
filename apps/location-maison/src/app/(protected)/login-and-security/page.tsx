import LoginAndSecurity from '@/components/login-and-security/LoginAndSecurity'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import connectionMethods from '@/constantes/connections-methods'
import { routes } from '@/constantes/routes'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import React from 'react'


export default async function page() {
    return (
        <div className='space-y-4 pb-20'>
            <div className='bg-white sticky top-0 flex gap-5 items-center border-b py-3 md:hidden px-4 z-50'>
                <Link href={routes.protected.profil}>
                    <ChevronLeft />
                </Link>
                <h1 className='text-xl font-bold'>Connexions et sécurités</h1>
            </div>
            <LoginAndSecurity />
        </div>
    )
}
