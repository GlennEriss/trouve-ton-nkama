import React from 'react'
import { Bell } from 'lucide-react';
import ProfilInformations from '@/components/profil/ProfilInformations';
import ProfilDetails from '@/components/profil/ProfilDetails';
import Logout from '../../../components/shared/Logout';

export default function page() {
    return (
        <div className='pt-2 md:pt-5 pb-5 px-4 space-y-5 lg:px-0'>
            <div className='flex items-center justify-between'>
                <h1 className='text-2xl font-bold'>Mon profil</h1>
                <Bell />
            </div>
            <ProfilInformations/>
            <ProfilDetails/>
            <Logout/>
        </div>
    )
}
