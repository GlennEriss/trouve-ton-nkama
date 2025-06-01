'use client';
import React from 'react';
import { Search, Heart, UserCircle, House, Bell } from 'lucide-react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Badge } from '../ui/badge';
import { useNotifications } from '@/providers/NotificationProvider';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const menu = [
    { title: 'Logements', icon: House, link: routes.protected.properties },
    { title: 'Favoris', icon: Heart, link: routes.protected.favoris },
    { title: 'Explorer', icon: Search, link: routes.public.homePage },
    { title: 'Notification', icon: Bell, link: routes.protected.notification_list },
    { title: 'Profil', icon: UserCircle, link: '/profil' },
];

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})

type BottomNavigationProps = {}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ }) => {
    const { user } = useCurrentUser()
    const pathnames = usePathname();
    const { unreadCount } = useNotifications();
    
    if (!user) return null;

    return (
        <div className={cn(
            "fixed bottom-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg md:hidden",
            "border-t border-gray-200 dark:border-gray-800",
            "safe-area-pb",
            inter.className
        )}>
            <div className="max-w-screen-xl mx-auto px-4 py-2">
                <div className="flex justify-between items-center">
                    {menu.map((item, key) => (
                        <Link
                            href={item.link}
                            key={key}
                            className={clsx(
                                'relative group flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200',
                                'hover:bg-gray-100 dark:hover:bg-gray-800',
                                pathnames === item.link 
                                    ? 'text-[#146B67] dark:text-[#1FA89B]' 
                                    : 'text-gray-600 dark:text-gray-400'
                            )}
                        >
                            {item.title === "Notification" && unreadCount > 0 && (
                                <Badge className="absolute -top-1 right-4 min-w-5 h-5 flex items-center justify-center rounded-full px-1.5 text-[10px] bg-red-500 text-white border-2 border-white dark:border-gray-900">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </Badge>
                            )}
                            <div className="relative">
                                <item.icon 
                                    size={22} 
                                    className={clsx(
                                        'transition-transform duration-200',
                                        'group-hover:scale-110',
                                        pathnames === item.link && 'stroke-[2.5px]'
                                    )} 
                                />
                                <div className={clsx(
                                    'absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-all duration-200',
                                    pathnames === item.link 
                                        ? 'bg-[#146B67] dark:bg-[#1FA89B] scale-100' 
                                        : 'scale-0'
                                )} />
                            </div>
                            <span className={clsx(
                                'text-[10px] mt-1 font-medium transition-colors duration-200',
                                pathnames === item.link 
                                    ? 'text-[#146B67] dark:text-[#1FA89B]' 
                                    : 'text-gray-600 dark:text-gray-400'
                            )}>
                                {item.title}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};