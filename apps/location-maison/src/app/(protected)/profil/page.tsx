import React from 'react'
import ProfilInformations from '@/components/profil/ProfilInformations';
import ProfilDetails from '@/components/profil/ProfilDetails';
import Logout from '../../../components/shared/Logout';

export default function page() {
    return (
        <div className='min-h-[70vh] bg-gray-50 px-4 pb-24 pt-2 text-gray-900 dark:bg-gray-950 dark:text-white md:bg-transparent md:pb-5 md:pt-5 md:dark:bg-transparent lg:px-0'>
            <div className='mx-auto max-w-5xl space-y-5'>
            <div className='flex items-center justify-between'>
                <h1 className='text-2xl font-bold'>Mon profil</h1>
            </div>
            <ProfilInformations/>
            <ProfilDetails/>
            <Logout/>
            </div>
        </div>
    )
}
