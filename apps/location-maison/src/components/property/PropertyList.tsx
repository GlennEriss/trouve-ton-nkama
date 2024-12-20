import Link from 'next/link'
import React from 'react'
import { Button } from '../ui/button'
import PropertyStatistics from './PropertyStatistics'
import { PropertyFilter } from './PropertyFilter'
import ListPropertySection from './ListPropertySection'
import { routes } from '@/constantes/routes'

export default function PropertyList() {
    return (
        <div className='space-y-4'>
            <div className='flex items-center justify-between'>
                <h1 className='text-xl font-bold'>Annonces</h1>
                <Button variant='outline' className='border-[#846CF9] hover:bg-[#846CF9] text-[#846CF9] hover:text-white' asChild>
                    <Link href={routes.protected.add_property}>
                        Ajouter
                    </Link>
                </Button>
            </div>
            <PropertyStatistics/>
            <PropertyFilter/>
            <ListPropertySection/>
        </div>
    )
}
