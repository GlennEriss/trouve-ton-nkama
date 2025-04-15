'use client'
import React from 'react'
import Logo from '../logo/Logo'
import { routes } from '@/constantes/routes'
import { MapPin, Phone, Mail } from "lucide-react";
import { usePathname } from 'next/navigation';

export default function Footer() {
    const pathname = usePathname()
    if(pathname === routes.public.signin || pathname === routes.public.signup) {
        return null
    }
    return (
        <footer className="shadow hidden md:block dark:bg-gray-900 dark:border-gray-900 dark:border-2 bg-gray-100 text-black border border-t-gray-400 border-t-2">
            <div className="w-full max-w-screen-xl mx-auto p-4 md:py-8">
                <div className="sm:flex sm:items-center sm:justify-between">
                    <Logo className='text-black'/>
                    <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-700 sm:mb-0">
                        <li>
                            <a href={"https://www.facebook.com/profile.php?id=61574099562451"} className="hover:underline me-4 md:me-6">À propos</a>
                        </li>
                        <li>
                            <a href={routes.public.confidentiality} className="hover:underline me-4 md:me-6">Politique de confidentialité</a>
                        </li>
                        <li>
                            <a href={routes.public.terms_of_use} className="hover:underline me-4 md:me-6">Conditions d'utilisation</a>
                        </li>
                    </ul>
                </div>

                {/* Section Contacts */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-4 text-gray-700 space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-2">
                        <MapPin size={16} />
                        <span>Libreville, Gabon</span>
                    </div>
                    {/* <div className="flex items-center space-x-2">
                        <Phone size={16} />
                        <a href="tel:+24160000000" className="hover:underline">+241 60 00 00 00</a>
                    </div> */}
                    <div className="flex items-center space-x-2">
                        <Mail size={16} />
                        <a href="mailto:contact@home-rent.com" className="hover:underline">contact@home-rent.com</a>
                    </div>
                </div>

                <hr className="my-6 border-gray-700 sm:mx-auto lg:my-8" />
                <span className="block text-sm text-gray-600 sm:text-center">
                    © 2023 <a href={routes.public.homePage} className="hover:underline">Home-Rent</a>. All Rights Reserved.
                </span>
            </div>
        </footer>
    )
}