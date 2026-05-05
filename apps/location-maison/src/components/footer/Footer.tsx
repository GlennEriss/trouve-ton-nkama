'use client'
import React from 'react'
import Logo from '../logo/Logo'
import { routes } from '@/constantes/routes'
import { MapPin, Mail, Facebook, MessageCircle } from "lucide-react";
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useWindowSize } from '@/hooks/useSize';
import { cn } from '@/lib/utils';
import PWAInstallButton from '@/components/pwa/PWAInstallButton';
import { isPropertyFormFlowPath } from '@/lib/ads/route-guards';
import InlineAdUnit from '@/components/ads/InlineAdUnit';
import { ADSENSE_SLOTS } from '@/lib/ads/config';

export default function Footer({ isHide = false }: Readonly<{ isHide?: boolean }>) {
    const pathname = usePathname()
    const { user } = useCurrentUser()
    const { width } = useWindowSize()
    const hiddenFooterRoutes = [
        routes.public.signin,
        routes.public.signup,
        routes.public.signinSignup,
        routes.public.completeProfile,
        routes.public.passwordResetRequest,
        routes.public.reset_password,
        routes.public.passwordResetFailure,
    ];
    const hideByRoute = isHide || hiddenFooterRoutes.includes(pathname) || isPropertyFormFlowPath(pathname)
    const showCompactMobileAdOnly = Boolean(user && width < 768 && pathname !== routes.public.homePage)

    if (hideByRoute) {
        return null
    }

    if (showCompactMobileAdOnly) {
        return (
            <div className="w-full px-3 py-2 md:hidden">
                <InlineAdUnit
                    className="mx-auto max-w-[520px]"
                    slot={ADSENSE_SLOTS.footer}
                    slotKey={`mobile-${pathname}`}
                    compact
                />
            </div>
        )
    }

    const supportEmail = process.env.NEXT_PUBLIC_EMAIL_SUPPORT ?? 'support@tonnkama.com'
    const whatsappNumber = process.env.NEXT_PUBLIC_CONTACT_SUPPORT?.replace('+', '').replace(/^00/, '')
    const whatsappUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=Bonjour%20!%20Je%20souhaite%20obtenir%20plus%20d'informations%20sur%20Trouve%20Ton%20Nkama.`
        : '#'

    const isImmersiveSearchPage = pathname === routes.public.search_property || pathname === routes.public.search_with_ia

    return (
        <footer className={cn("w-full border-t border-[#1d3d3a] bg-[#0f1f1e] text-white", isImmersiveSearchPage && "lg:hidden")}>
            <div className="max-w-[1280px] 2xl:max-w-[1440px] mx-auto p-4 py-10 md:py-12">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-10">
                    <div className='md:col-span-4 lg:col-span-3 space-y-4'>
                        <Logo className="text-white" width="64px" height="64px" />
                        <p className='text-sm text-white/75 leading-relaxed max-w-xs'>
                            Trouve Ton Nkama simplifie la recherche, la location et la vente de biens immobiliers au Gabon.
                        </p>
                    </div>

                    <nav className="md:col-span-4 lg:col-span-5">
                        <h2 className='text-sm font-semibold uppercase tracking-wide text-white/70'>Liens utiles</h2>
                        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm font-medium text-white/90">
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
                            <li>
                                <a href={routes.public.announcer_terms} className="hover:underline py-1">Conditions annonceur</a>
                            </li>
                        </ul>
                    </nav>

                    <div className="md:col-span-4 lg:col-span-4">
                        <h2 className='text-sm font-semibold uppercase tracking-wide text-white/70'>Contact</h2>
                        <div className="mt-4 flex flex-col gap-3 text-white/90 text-sm">
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className='text-[#4DBEA4]' />
                                <span>Libreville, Gabon</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail size={16} className='text-[#4DBEA4]' />
                                <a href={`mailto:${supportEmail}`} className="hover:underline break-all">{supportEmail}</a>
                            </div>
                            <div className="flex items-center gap-2">
                                <Facebook size={16} className='text-[#4DBEA4]' />
                                <a href="https://www.facebook.com/share/16beeh915e/" target="_blank" rel="noopener noreferrer" className="hover:underline">Suivez-nous sur Facebook</a>
                            </div>
                            <div className="flex items-center gap-2">
                                <MessageCircle size={16} className='text-[#4DBEA4]' />
                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Contactez-nous sur WhatsApp</a>
                            </div>
                        </div>
                    </div>
                </div>

                <InlineAdUnit
                    className="mt-8"
                    slot={ADSENSE_SLOTS.footer}
                    slotKey={`footer-${pathname}`}
                />

                <div className='mt-6'>
                    <PWAInstallButton />
                </div>

                <hr className="my-6 border-white/15 sm:mx-auto lg:my-8" />
                <span className="block text-sm text-white/80 text-center">
                    © {new Date().getFullYear()} <a href={routes.public.homePage} className="hover:underline">Trouve Ton Nkama</a>. Tous droits réservés.
                </span>
            </div>
        </footer>
    )
}
