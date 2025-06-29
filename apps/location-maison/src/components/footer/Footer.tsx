'use client'
import React from 'react'
import Logo from '../logo/Logo'
import { routes } from '@/constantes/routes'
import { MapPin, Mail } from "lucide-react";
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useWindowSize } from '@/hooks/useSize';
import { cn } from '@/lib/utils';

export default function Footer({ isHide = false }: Readonly<{ isHide?: boolean }>) {
    const pathname = usePathname()
    const { user } = useCurrentUser()
    const { width } = useWindowSize()
    if (isHide || pathname === routes.public.signin || pathname === routes.public.signup || pathname === routes.public.signinSignup || (user && width < 768)) {
        return null
    }
    return (
        <footer className={cn("shadow md:block dark:bg-gray-900 text-white dark:border-gray-900 dark:border-2 bg-black md:bg-[#282828] md:text-black", pathname === routes.public.search_property && "lg:hidden")}>
            <div className="w-full max-w-screen-xl mx-auto p-4 md:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className='hidden md:block'>
                        <Logo className="text-black mb-4 sm:mb-0" />
                    </div>
                    <ul className="flex flex-col sm:flex-row items-center mb-4 sm:mb-0 text-sm font-medium text-white space-y-2 sm:space-y-0 sm:space-x-6">
                        <li>
                            <a href="https://www.facebook.com/profile.php?id=61574099562451" className="hover:underline">À propos</a>
                        </li>
                        <li>
                            <a href={routes.public.confidentiality} className="hover:underline">Politique de confidentialité</a>
                        </li>
                        <li>
                            <a href={routes.public.terms_of_use} className="hover:underline">Conditions d'utilisation</a>
                        </li>
                    </ul>
                </div>

                {/* Section Contacts */}
                <div className="flex">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 text-white space-y-4 sm:space-y-0 sm:space-x-6">
                        <div className="flex items-center space-x-2">
                            <MapPin size={16} />
                            <span>Libreville, Gabon</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Mail size={16} />
                            <a href={`mailto:${process.env.NEXT_PUBLIC_EMAIL_SUPPORT}`} className="hover:underline">{process.env.NEXT_PUBLIC_EMAIL_SUPPORT}</a>
                        </div>
                    </div>
                    <div className='ml-auto md:hidden mt-auto'>
                        <Logo className="text-black mb-4 sm:mb-0" />
                    </div>
                </div>


                <hr className="my-6 border-gray-700 sm:mx-auto lg:my-8" />
                <span className="block text-sm text-white text-center">
                    © 2023 <a href={routes.public.homePage} className="hover:underline">LogisGabon</a>. All Rights Reserved.
                </span>
            </div>
        </footer>
    )
}