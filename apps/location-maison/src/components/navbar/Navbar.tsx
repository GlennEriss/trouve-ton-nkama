'use client'
import React from 'react'
import Logo from '../logo/Logo'
import Link from 'next/link'
import { routes } from '@/constantes/routes'
import { ThemeMode } from '../shared/ThemeMode'
import MenuProfil from './MenuProfil'
import Notifications from './Notifications'

export default function Navbar() {
    return (
        <div className='hidden md:flex md:items-center md:justify-between py-3 md:px-10 xl:px-20 md:sticky md:top-0 md:bg-white md:z-50 border-b shadow'>
            <Link href={routes.public.homePage}>
                <Logo className='text-xl' />
            </Link>
            <div className='flex items-center'>
                <Notifications/>
                <MenuProfil />
                <ThemeMode />
            </div>
        </div>
    )
}
