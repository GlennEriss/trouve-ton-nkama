'use client';
import React from 'react';
import { Search, Heart, UserCircle, House, Bell } from 'lucide-react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Badge } from '../ui/badge';
import { useNotifications } from '@/providers/NotificationProvider';
import { Session } from 'next-auth';

const menu = [
    { title: 'Logements', icon: House, link: routes.protected.properties },
    { title: 'Favoris', icon: Heart, link: routes.protected.favoris },
    { title: 'Explorer', icon: Search, link: routes.public.homePage },
    { title: 'Notification', icon: Bell, link: routes.protected.notification_list },
    { title: 'Profil', icon: UserCircle, link: '/profil' },
];
type BottomNavigationProps = {session: Session|null}
export const BottomNavigation: React.FC<BottomNavigationProps> = ({session}) => {
    const pathnames = usePathname();
    const { unreadCount } = useNotifications();
    if (!session) return null;

    return (
        <div className="fixed bottom-0 z-50 w-full flex bg-white p-4 justify-between md:hidden shadow border-t">
            {menu.map((item, key) => (
                <Link
                    href={item.link}
                    key={key}
                    className={clsx(
                        'relative text-xs flex flex-col items-center',
                        pathnames === item.link ? 'text-[#846CF9]' : ''
                    )}
                >
                    {/* Ajout du badge si c'est l'icône Notification */}
                    {item.title === "Notification" && unreadCount > 0 && (
                        <Badge className="absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center rounded-full px-1 text-xs bg-red-500 text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                    )}
                    <item.icon size={25} />
                </Link>
            ))}
        </div>
    );
};