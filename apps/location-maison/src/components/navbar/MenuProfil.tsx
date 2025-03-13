'use client'
import React, { useTransition } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { routes } from '@/constantes/routes'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { useCurrentUser } from '@/hooks/use-current-user'
import { generateColorFromName } from '@/lib/generateColorFromName'
import { signout } from '@/actions/signout'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

const menu = [
    {
        title: 'Mon profil',
        link: routes.protected.profil
    },
    {
        title: 'Mes logements',
        link: routes.protected.properties
    },
    {
        title: 'Favoris',
        link: routes.protected.favoris
    }
]

export default function MenuProfil() {
    const user = useCurrentUser()
    const { toast } = useToast();
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const avatarBackground = generateColorFromName(user?.firstname);

    const handleSignout = () => {
        startTransition(async () => {
            const isSignout = await signout()
            if (isSignout) {
                toast({
                    title: "Déconnexion",
                    description: "Vous vous êtes déconnecté de la plateforme",
                    variant: "warning",
                });
                router.push(routes.public.signin)
            } else {
                toast({
                    title: "Déconnexion",
                    description: "Une erreur est survenue durant la déconnexion.",
                    variant: "destructive",
                });
            }
        })
    }

    const handleNavigate = (link: string) => {
        router.push(link)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='focus:ring-0 focus-visible:ring-0 hover:bg-transparent dark:hover:bg-transparent'>
                    <Avatar>
                        <AvatarImage src={user?.image ?? ''} alt={user?.firstname + '' + user?.lastname} />
                        <AvatarFallback
                            style={{ backgroundColor: avatarBackground }}
                            className='text-2xl font-bold text-white'>
                            {user?.firstname?.at(0) ?? ''}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 z-50 bg-white dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator className='bg-gray-200 dark:bg-gray-700' />
                <DropdownMenuGroup>
                    {
                        menu.map((item, index) => (
                            <DropdownMenuItem
                                onClick={() => handleNavigate(item.link)}
                                key={index}
                                className='cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                                {item.title}
                            </DropdownMenuItem>
                        ))
                    }
                </DropdownMenuGroup>
                <div className='flex justify-center hover:bg-white dark:hover:bg-gray-800 my-2'>
                    <Button
                        onClick={handleSignout}
                        variant='outline'
                        className='border rounded-lg border-red-500 text-red-500 hover:bg-red-500 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400 dark:hover:text-black transition-all'>
                        {
                            isPending ? (
                                <div className="w-5 h-5 border-4 border-red-500 rounded-full animate-spin border-t-transparent"></div>
                            ) : (
                                <span>Se déconnecter</span>
                            )
                        }
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}