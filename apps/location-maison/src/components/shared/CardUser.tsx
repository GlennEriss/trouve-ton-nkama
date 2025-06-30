import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { FaUserCircle } from 'react-icons/fa'
import { BiBuilding } from 'react-icons/bi'
import { routes } from '@/constantes/routes'
import { Button } from '../ui/button'
import Link from 'next/link'

const menu = [
    {
        label: 'Mon compte',
        link: routes.protected.account,
        icon: FaUserCircle
    },
    {
        label: 'Propriétés',
        link: routes.protected.properties,
        icon: BiBuilding
    }
]
export default function CardUser() {
    return (
        <Card className="md:w-1/3 bg-[#1B4D5B] md:h-[300px]">
            <CardHeader className='grid grid-cols-3 md:flex md:flex-col md:items-center xl:flex-row xl:gap-3'>
                <Avatar className='w-20 h-20'>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className='col-span-2 space-y-2'>
                    <CardTitle className='md:text-center text-white'>John Doe</CardTitle>
                    <CardDescription className='md:text-center flex flex-col text-[#eaeaed]'>
                        <span>johndoe@gmail.com</span>
                        <span>Depuis le 20/09/2024</span>
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className='hidden md:block md:space-y-2'>
                {
                    menu.map((item, key) => (
                        <Button variant='outline' asChild className='w-full justify-start text-white hover:text-[#1B4D5B]'>
                            <Link href={item.link} className='flex gap-2'>
                                <item.icon />
                                <span>
                                    {item.label}
                                </span>
                            </Link>
                        </Button>
                    ))
                }
            </CardContent>
        </Card>
    )
}
