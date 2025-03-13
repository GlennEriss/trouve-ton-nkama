import React from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/constantes/routes'
import FormPersonalInformation from '@/components/profil/FormPersonalInformation'
import CardUserProfil from '@/components/profil/CardUserProfil'

export default function page() {
    return (
        <div className='space-y-4 pb-20'>
            <div className='bg-white sticky top-0 flex gap-5 items-center border-b py-3 md:hidden px-4 z-50'>
                <Link href={routes.protected.profil}>
                    <ChevronLeft />
                </Link>
                <h1 className='text-xl font-bold'>Informations personnelles</h1>
            </div>
            <div className='flex flex-col gap-5 px-4 items-center lg:flex-row lg:items-start lg:gap-0'>
                <CardUserProfil/>
                <FormPersonalInformation />
            </div>
        </div>
    )
}
