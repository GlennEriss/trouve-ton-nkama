'use client'
import React, { useEffect, useState } from 'react'
import Logo from '../logo/Logo'
import { routes } from '@/constantes/routes'
import { MapPin, Mail, Facebook, MessageCircle } from "lucide-react";
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useWindowSize } from '@/hooks/useSize';
import { cn } from '@/lib/utils';
import PWAInstallButton from '@/components/pwa/PWAInstallButton';

export default function Footer({ isHide = false }: Readonly<{ isHide?: boolean }>) {
    const pathname = usePathname()
    const { user } = useCurrentUser()
    const { width } = useWindowSize()
    const [isPWAInstalled, setIsPWAInstalled] = useState(false);

    useEffect(() => {
        const checkPWA = () => {
            if (typeof window !== "undefined") {
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || (window.navigator as any).standalone === true;
                setIsPWAInstalled(isStandalone);
            }
        };
        checkPWA();
        window.addEventListener('appinstalled', checkPWA);
        return () => window.removeEventListener('appinstalled', checkPWA);
    }, []);

    if (isHide || pathname === routes.public.signin || pathname === routes.public.signup || pathname === routes.public.signinSignup || (user && width < 768 && pathname !== routes.public.homePage)) {
        return null
    }
    return (
        <footer className={cn("w-full shadow md:block dark:bg-gray-900 text-white dark:border-gray-900 dark:border-2 bg-black md:bg-[#282828] md:text-black", pathname === routes.public.search_property && "lg:hidden")}>
            <div className="max-w-[1280px] 2xl:max-w-[1440px] mx-auto p-4 md:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className='hidden md:block'>
                        <Logo className="text-black mb-4 sm:mb-0" width="64px" height="64px" />
                    </div>
                    <ul className="flex flex-col sm:flex-row items-center mb-4 sm:mb-0 text-sm font-medium text-white space-y-3 sm:space-y-0 sm:space-x-6">
                        <li>
                            <a href="https://www.facebook.com/profile.php?id=61574099562451" className="hover:underline py-1">À propos</a>
                        </li>
                        <li>
                            <a href={routes.public.blog} className="hover:underline py-1">Blog</a>
                        </li>
                        <li>
                            <a href={routes.public.guide_immobilier_gabon} className="hover:underline py-1">Guide Immobilier</a>
                        </li>
                        <li>
                            <a href={routes.public.confidentiality} className="hover:underline py-1">Politique de confidentialité</a>
                        </li>
                        <li>
                            <a href={routes.public.terms_of_use} className="hover:underline py-1">Conditions d&apos;utilisation</a>
                        </li>
                    </ul>
                </div>

                {/* Section Contacts */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-white space-y-4 sm:space-y-0 sm:space-x-6">
                        <div className="flex items-center space-x-2">
                            <MapPin size={16} />
                            <span>Libreville, Gabon</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Mail size={16} />
                            <a href={`mailto:${process.env.NEXT_PUBLIC_EMAIL_SUPPORT}`} className="hover:underline">{process.env.NEXT_PUBLIC_EMAIL_SUPPORT}</a>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Facebook size={16} />
                            <a href="https://www.facebook.com/share/16beeh915e/" target="_blank" rel="noopener noreferrer" className="hover:underline">Suivez-nous sur Facebook</a>
                        </div>
                        <div className="flex items-center space-x-2">
                            <MessageCircle size={16} />
                            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_CONTACT_SUPPORT?.replace('+', '').replace(/^00/, '')}?text=Bonjour%20!%20Je%20souhaite%20obtenir%20plus%20d'informations%20sur%20Trouve%20Ton%20Nkama.`} target="_blank" rel="noopener noreferrer" className="hover:underline">Contactez-nous sur WhatsApp</a>
                        </div>
                    </div>
                    <div className='sm:hidden mt-4 flex justify-center'>
                        <Logo className="text-white" width="64px" height="64px" />
                    </div>
                </div>

                {/* Bouton d'installation PWA, non flottant */}
                <PWAInstallButton />

                <hr className="my-6 border-gray-700 sm:mx-auto lg:my-8" />
                <span className="block text-sm text-white text-center">
                    © 2025 <a href={routes.public.homePage} className="hover:underline">Trouve Ton Nkama</a>. Tous droits réservés.
                </span>
            </div>
        </footer>
    )
}