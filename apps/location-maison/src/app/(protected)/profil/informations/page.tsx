import React from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/constantes/routes'
import FormPersonalInformation from '@/components/profil/FormPersonalInformation'

export default function page() {
    return (
        <div>
            <div className='sticky top-0 flex gap-5 items-center border-b py-3'>
                <Link href={routes.protected.profil}>
                    <ChevronLeft />
                </Link>
                <h1 className='text-xl font-bold'>Informations personnelles</h1>
            </div>
            <FormPersonalInformation/>
        </div>
    )
}
