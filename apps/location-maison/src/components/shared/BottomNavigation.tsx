'use client';
import React from 'react';
import { Search, Heart, UserCircle, Bell, Plus, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Badge } from '../ui/badge';
import { useNotifications } from '@/providers/NotificationProvider';
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

const NavItem: React.FC<{ item: NavItemDef; isActive: boolean; badge?: number }> = ({ item, isActive, badge }) => (
    <Link
        href={item.link}
        className={clsx(
            'relative flex flex-col items-center gap-1 flex-1 pt-3 pb-2 transition-colors duration-200',
            isActive ? 'text-[#146B67] dark:text-[#1FA89B]' : 'text-gray-500 dark:text-gray-400'
        )}
    >
        {badge != null && badge > 0 && (
            <Badge className="absolute top-2 right-[calc(50%-18px)] min-w-4 h-4 flex items-center justify-center rounded-full px-1 text-[9px] bg-red-500 text-white border-2 border-white dark:border-gray-900">
                {badge > 99 ? '99+' : badge}
            </Badge>
        )}
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
    const { unreadCount } = useNotifications();
    const isAnnouncer = Array.isArray(user?.roles) && user.roles.includes('Announcer');

    if (!user) return null;

    if (isAnnouncer) {
        const leftItems: NavItemDef[] = [
            { title: 'Annonces', icon: LayoutGrid, link: routes.protected.properties },
            { title: 'Recherche', icon: Search, link: routes.public.search },
        ];
        const rightItems: NavItemDef[] = [
            { title: 'Notifs', icon: Bell, link: routes.protected.notification_list },
            { title: 'Profil', icon: UserCircle, link: routes.protected.profil },
        ];

        return (
            <div className={cn(
                'fixed bottom-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg md:hidden',
                'border-t border-gray-200 dark:border-gray-800',
                'safe-area-pb',
                inter.className
            )}>
                <div className="max-w-screen-xl mx-auto px-1">
                    <div className="flex items-end justify-around">
                        {leftItems.map((item) => (
                            <NavItem
                                key={item.link}
                                item={item}
                                isActive={pathnames === item.link}
                            />
                        ))}

                        {/* Bouton central surélevé */}
                        <div className="flex flex-col items-center flex-1 pb-2">
                            <Link
                                href={routes.protected.add_property}
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
                                isActive={pathnames === item.link}
                                badge={item.title === 'Notifs' ? unreadCount : undefined}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const userMenu: NavItemDef[] = [
        { title: 'Recherche', icon: Search, link: routes.public.search },
        { title: 'Favoris', icon: Heart, link: routes.protected.favoris },
        { title: 'Notifs', icon: Bell, link: routes.protected.notification_list },
        { title: 'Profil', icon: UserCircle, link: routes.protected.profil },
    ];

    return (
        <div className={cn(
            'fixed bottom-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg md:hidden',
            'border-t border-gray-200 dark:border-gray-800',
            'safe-area-pb',
            inter.className
        )}>
            <div className="max-w-screen-xl mx-auto px-1">
                <div className="flex items-end justify-around">
                    {userMenu.map((item) => (
                        <NavItem
                            key={item.link}
                            item={item}
                            isActive={pathnames === item.link}
                            badge={item.title === 'Notifs' ? unreadCount : undefined}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
