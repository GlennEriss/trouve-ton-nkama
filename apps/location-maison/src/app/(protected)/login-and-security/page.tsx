import LoginAndSecurity from '@/components/login-and-security/LoginAndSecurity'
import AppMobileStickyHeader from '@/components/shared/AppMobileStickyHeader'
import { routes } from '@/constantes/routes'
import React from 'react'


export default async function page() {
    return (
        <div className='space-y-4 pb-20'>
            <AppMobileStickyHeader
                title='Connexion et sécurité'
                backHref={routes.protected.profil}
                mobileOnly={false}
                className='border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 md:px-6'
            />
            <LoginAndSecurity />
        </div>
    )
}
