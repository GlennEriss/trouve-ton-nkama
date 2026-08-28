'use client'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@trouve-ton-nkama/ui/avatar'
import { routes } from '@/constantes/routes'
import { Button } from '@trouve-ton-nkama/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@trouve-ton-nkama/ui/dropdown-menu'
import { useCurrentUser } from '@/hooks/use-current-user'
import { generateColorFromName } from '@/lib/generateColorFromName'
import { getUserDisplayInitial, getUserDisplayName } from '@/lib/user-display-name'
import { useRouter } from 'next/navigation'
import { useSignOut } from '@/features/auth/hooks'
import { User, Coins, Heart, LogOut, ChevronDown } from 'lucide-react'

const menu = [
    {
        title: 'Mon profil',
        link: routes.protected.profil,
        icon: User,
        description: 'Gérer mes informations'
    },
    {
        title: 'Mon solde',
        link: routes.protected.my_balance,
        icon: Coins,
        description: 'Crédits et transactions'
    },
    {
        title: 'Favoris',
        link: routes.protected.favoris,
        icon: Heart,
        description: 'Mes annonces sauvées'
    }
]

export default function MenuProfil() {
    const { user } = useCurrentUser()
    const router = useRouter()
    const { signOut, isSigningOut } = useSignOut()
    const displayName = getUserDisplayName(user);
    const avatarBackground = generateColorFromName(displayName ?? '');

    const handleNavigate = (link: string) => {
        router.push(link)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant='ghost' 
                    aria-label="Ouvrir le menu du profil"
                    className='relative h-10 w-10 rounded-full focus:ring-2 focus:ring-primary focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group'
                >
                    <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-gray-800 group-hover:ring-primary/20 transition-all duration-200">
                            <AvatarImage src={user?.image ?? ''} alt={displayName ?? ''} />
                            <AvatarFallback
                                style={{ backgroundColor: avatarBackground }}
                                className='text-sm font-semibold text-white'>
                                {getUserDisplayInitial(user)}
                            </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors duration-200 hidden sm:block" />
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-72 mt-2 p-0 bg-white dark:bg-gray-900 border-0 shadow-xl rounded-2xl overflow-hidden z-[9999]"
                align="end"
                sideOffset={8}
            >
                {/* Header avec informations utilisateur */}
                <div className="px-4 py-4 bg-gradient-to-r from-primary to-secondary text-white">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-white/20">
                            <AvatarImage src={user?.image ?? ''} alt={displayName ?? ''} />
                            <AvatarFallback
                                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                                className='text-lg font-semibold text-white border border-white/20'>
                                {getUserDisplayInitial(user)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">
                                {displayName}
                            </p>
                            <p className="text-sm text-white/80 truncate">
                                {user?.email}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                    <DropdownMenuGroup>
                        {menu.map((item) => {
                            const IconComponent = item.icon
                            return (
                                <DropdownMenuItem
                                    key={item.link}
                                    onClick={() => handleNavigate(item.link)}
                                    className='mx-2 my-1 px-3 py-3 cursor-pointer rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 group'
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-200">
                                            <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors duration-200" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-secondary transition-colors duration-200">
                                                {item.title}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuGroup>
                </div>

                <DropdownMenuSeparator className='mx-2 bg-gray-200 dark:bg-gray-700' />

                {/* Bouton de déconnexion */}
                <div className='p-2'>
                    <Button
                        onClick={signOut}
                        disabled={isSigningOut}
                        variant="ghost"
                        className='w-full justify-start gap-3 h-12 px-3 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200 rounded-xl group'
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/50 group-hover:bg-red-100 dark:group-hover:bg-red-950 flex items-center justify-center transition-all duration-200">
                            {isSigningOut ? (
                                <div className="w-5 h-5 border-2 border-red-500 rounded-full animate-spin border-t-transparent"></div>
                            ) : (
                                <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-medium">
                                {isSigningOut ? 'Déconnexion...' : 'Se déconnecter'}
                            </p>
                            <p className="text-xs text-red-500 dark:text-red-400">
                                Fermer votre session
                            </p>
                        </div>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
