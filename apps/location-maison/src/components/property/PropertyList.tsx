import Link from 'next/link'
import React from 'react'
import { Button } from '../ui/button'
import PropertyStatistics from './PropertyStatistics'
import { PropertyFilter } from './PropertyFilter'
import ListPropertySection from './ListPropertySection'
import { routes } from '@/constantes/routes'

export default function PropertyList() {
    return (
        <div className='space-y-4 mb-20'>
            <section className='sticky top-0 md:static z-50 bg-white px-5 py-4 shadow border-b flex items-center justify-between'>
                <h1 className='text-xl font-bold'>Annonces</h1>
                <Button variant='outline' className='border-[#846CF9] hover:bg-[#846CF9] text-[#846CF9] hover:text-white' asChild>
                    <Link href={routes.protected.add_property}>
                        Ajouter
                    </Link>
                </Button>
            </section>
            <section className='px-5'>
                <PropertyStatistics />
                <PropertyFilter />
                <ListPropertySection />
            </section>

        </div>
    )
}
