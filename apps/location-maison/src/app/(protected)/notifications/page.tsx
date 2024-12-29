import ParameterNotifications from '@/components/notifications/ParameterNotifications'
import { routes } from '@/constantes/routes'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

export default function page() {
    return (
        <div className='space-y-4 pb-20'>
            <div className='bg-white sticky top-0 flex gap-5 items-center border-b py-3 md:hidden px-4 z-50'>
                <Link href={routes.protected.profil}>
                    <ChevronLeft />
                </Link>
                <h1 className='text-xl font-bold'>Notifications</h1>
            </div>
            <ParameterNotifications />
        </div>
    )
}
