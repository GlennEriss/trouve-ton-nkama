import React from 'react'
import { Bell } from 'lucide-react';
import ProfilInformations from '@/components/profil/ProfilInformations';
import ProfilDetails from '@/components/profil/ProfilDetails';
import Logout from '../../../components/shared/Logout';
import { Separator } from '@/components/ui/separator';

export default function page() {
    return (
        <div className='py-5 px-4 space-y-5 lg:px-0'>
            <div className='flex items-center justify-between'>
                <h1 className='text-2xl font-bold'>Mon profil</h1>
                <Bell />
            </div>
            <ProfilInformations/>
            <ProfilDetails/>
            <Separator className='md:hidden'/>
            <Logout/>
        </div>
    )
}
