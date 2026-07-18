'use client';
import React from 'react';
import { Home, Search, Heart, UserCircle, Plus, LayoutGrid, Megaphone, Video } from 'lucide-react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})

type NavItemDef = {
    title: string;
    icon: React.ElementType;
    link: string;
}

const BOTTOM_NAV_SPACER_HEIGHT = 'calc(6rem + env(safe-area-inset-bottom, 0px))'

const isActivePath = (pathname: string, link: string) => {
    if (link === routes.public.homePage) return pathname === link;
    return pathname === link || pathname.startsWith(`${link}/`);
}

const GUEST_BOTTOM_NAV_HIDDEN_PREFIXES = [
    routes.public.signin,
    routes.public.signup,
    routes.public.signinSignup,
    routes.public.completeProfile,
    routes.public.reset_password,
    routes.public.passwordResetRequest,
    routes.protected.add_property,
    routes.protected.reels_add,
    routes.protected.reels_select_property,
    routes.protected.reels_mine,
] as const

function shouldHideGuestBottomNavigation(pathname: string) {
    return GUEST_BOTTOM_NAV_HIDDEN_PREFIXES.some((prefix) => isActivePath(pathname, prefix))
}

// Routes masquées pour TOUT le monde (pas seulement les visiteurs) : la création et l'édition
// de réel sont des éditeurs plein écran façon statut WhatsApp (fixed inset-0) — cette barre
// (z-50, fixed bottom) recouvrirait la légende et le bouton d'envoi.
const ALWAYS_HIDDEN_PREFIXES = [routes.protected.reels_add] as const
const REEL_EDIT_ROUTE_REGEX = /^\/reels\/[^/]+\/edit\/?$/

function shouldHideBottomNavigationForEveryone(pathname: string) {
    return (
        ALWAYS_HIDDEN_PREFIXES.some((prefix) => isActivePath(pathname, prefix)) ||
        REEL_EDIT_ROUTE_REGEX.test(pathname)
    )
}

function shouldReserveBottomNavigationSpace(pathname: string) {
    return pathname !== routes.protected.reels
}

function BottomNavigationFrame({
    children,
    reserveSpace,
}: Readonly<{
    children: React.ReactNode
    reserveSpace: boolean
}>) {
    return (
        <>
            {reserveSpace && (
                <div
                    aria-hidden="true"
                    className="md:hidden"
                    style={{ height: BOTTOM_NAV_SPACER_HEIGHT }}
                />
            )}
            <nav
                aria-label="Navigation mobile"
                className={cn(
                    'fixed bottom-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg md:hidden',
                    'border-t border-gray-200 dark:border-gray-800',
                    'safe-area-pb',
                    inter.className
                )}
            >
                {children}
            </nav>
        </>
    )
}

const NavItem: React.FC<{ item: NavItemDef; isActive: boolean }> = ({ item, isActive }) => (
    <Link
        href={item.link}
        className={clsx(
            'relative flex flex-col items-center gap-1 flex-1 pt-3 pb-2 transition-colors duration-200',
            isActive ? 'text-[#146B67] dark:text-[#1FA89B]' : 'text-gray-500 dark:text-gray-400'
        )}
    >
        <div className={clsx(
            'p-1.5 rounded-xl transition-all duration-200',
            isActive && 'bg-[#146B67]/10 dark:bg-[#1FA89B]/10'
        )}>
            <item.icon
                size={22}
                className={clsx(isActive && 'stroke-[2.5px]')}
            />
        </div>
        <span className="text-[10px] font-medium leading-none">{item.title}</span>
    </Link>
);

export const BottomNavigation: React.FC = () => {
    const { user } = useCurrentUser();
    const pathnames = usePathname();
    const isAnnouncer = Array.isArray(user?.roles) && user.roles.includes('Announcer');
    const reserveSpace = shouldReserveBottomNavigationSpace(pathnames);

    if (shouldHideBottomNavigationForEveryone(pathnames)) return null;

    if (!user) {
        if (shouldHideGuestBottomNavigation(pathnames)) return null;

        const leftItems: NavItemDef[] = [
            { title: 'Accueil', icon: Home, link: routes.public.homePage },
            { title: 'Recherche', icon: Search, link: routes.public.search },
        ];
        const rightItems: NavItemDef[] = [
            { title: 'Réels', icon: Video, link: routes.protected.reels },
            { title: 'Connexion', icon: UserCircle, link: routes.public.signin },
        ];

        return (
            <BottomNavigationFrame reserveSpace={reserveSpace}>
                <div className="max-w-screen-xl mx-auto px-1">
                    <div className="flex items-end justify-around">
                        {leftItems.map((item) => (
                            <NavItem
                                key={item.link}
                                item={item}
                                isActive={isActivePath(pathnames, item.link)}
                            />
                        ))}

                        {/* Même design que la navigation mobile connectée, avec action centrale. */}
                        <div className="flex flex-col items-center flex-1 pb-2">
                            <Link
                                href={routes.protected.publish}
                                className="flex flex-col items-center gap-1 group -mt-6"
                            >
                                <div className={clsx(
                                    'w-14 h-14 rounded-full bg-[#146B67] flex items-center justify-center',
                                    'shadow-lg shadow-[#146B67]/30',
                                    'border-4 border-white dark:border-gray-900',
                                    'transition-transform duration-200 active:scale-95 group-hover:scale-105'
                                )}>
                                    <Plus size={26} className="text-white stroke-[2.5px]" />
                                </div>
                                <span className="text-[10px] font-semibold text-[#146B67] dark:text-[#1FA89B] leading-none">
                                    Publier
                                </span>
                            </Link>
                        </div>

                        {rightItems.map((item) => (
                            <NavItem
                                key={item.link}
                                item={item}
                                isActive={isActivePath(pathnames, item.link)}
                            />
                        ))}
                    </div>
                </div>
            </BottomNavigationFrame>
        );
    }

    if (isAnnouncer) {
        const leftItems: NavItemDef[] = [
            { title: 'Annonces', icon: LayoutGrid, link: routes.protected.properties },
            { title: 'Recherche', icon: Search, link: routes.public.search },
        ];
        const rightItems: NavItemDef[] = [
            { title: 'Réels', icon: Video, link: routes.protected.reels },
            { title: 'Profil', icon: UserCircle, link: routes.protected.profil },
        ];

        return (
            <BottomNavigationFrame reserveSpace={reserveSpace}>
                <div className="max-w-screen-xl mx-auto px-1">
                    <div className="flex items-end justify-around">
                        {leftItems.map((item) => (
                            <NavItem
                                key={item.link}
                                item={item}
                                isActive={isActivePath(pathnames, item.link)}
                            />
                        ))}

                        {/* Bouton central surélevé */}
                        <div className="flex flex-col items-center flex-1 pb-2">
                            <Link
                                href={routes.protected.publish}
                                className="flex flex-col items-center gap-1 group -mt-6"
                            >
                                <div className={clsx(
                                    'w-14 h-14 rounded-full bg-[#146B67] flex items-center justify-center',
                                    'shadow-lg shadow-[#146B67]/30',
                                    'border-4 border-white dark:border-gray-900',
                                    'transition-transform duration-200 active:scale-95 group-hover:scale-105'
                                )}>
                                    <Plus size={26} className="text-white stroke-[2.5px]" />
                                </div>
                                <span className="text-[10px] font-semibold text-[#146B67] dark:text-[#1FA89B] leading-none">
                                    Publier
                                </span>
                            </Link>
                        </div>

                        {rightItems.map((item) => (
                            <NavItem
                                key={item.link}
                                item={item}
                                isActive={isActivePath(pathnames, item.link)}
                            />
                        ))}
                    </div>
                </div>
            </BottomNavigationFrame>
        );
    }

    const userMenu: NavItemDef[] = [
        { title: 'Recherche', icon: Search, link: routes.public.search },
        { title: 'Pub', icon: Megaphone, link: routes.protected.advertising },
        { title: 'Favoris', icon: Heart, link: routes.protected.favoris },
        { title: 'Réels', icon: Video, link: routes.protected.reels },
        { title: 'Profil', icon: UserCircle, link: routes.protected.profil },
    ];

    return (
        <BottomNavigationFrame reserveSpace={reserveSpace}>
            <div className="max-w-screen-xl mx-auto px-1">
                <div className="flex items-end justify-around">
                    {userMenu.map((item) => (
                        <NavItem
                            key={item.link}
                            item={item}
                            isActive={isActivePath(pathnames, item.link)}
                        />
                    ))}
                </div>
            </div>
        </BottomNavigationFrame>
    );
};
