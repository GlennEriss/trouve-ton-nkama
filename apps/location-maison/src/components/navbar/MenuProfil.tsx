import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { routes } from '@/constantes/routes'
import { Button } from '../ui/button'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'

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
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='focus:ring-0 focus-visible:ring-0 hover:bg-white'>
                    <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 z-50 bg-white rounded-xl">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator className='bg-gray-200' />
                <DropdownMenuGroup>
                    {
                        menu.map((item, index) => (
                            <DropdownMenuItem key={index} className='hover:text-[#846CF9] cursor-pointer'>
                                <Link href={item.link}>
                                    {item.title}
                                </Link>
                            </DropdownMenuItem>
                        ))
                    }
                    <DropdownMenuItem className='flex justify-center hover:bg-white'>
                        <Button variant='outline' className='border rounded-lg border-red-500 text-red-500 hover:bg-red-500 hover:text-white'>
                            Se déconnecter
                        </Button>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
