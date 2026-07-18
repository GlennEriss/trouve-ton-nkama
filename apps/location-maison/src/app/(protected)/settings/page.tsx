import ParameterNotifications from '@/components/notifications/ParameterNotifications'
import ParameterSystem from '@/components/notifications/ParameterSystem'
import AppMobileStickyHeader from '@/components/shared/AppMobileStickyHeader'
import { routes } from '@/constantes/routes'
import React from 'react'

export default function page() {
    return (
        <div className='space-y-4 pb-20'>
            <AppMobileStickyHeader
                title='Paramètres'
                backHref={routes.protected.profil}
                mobileOnly={false}
                className='border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 md:px-6'
            />
            <ParameterSystem />
            <ParameterNotifications />
        </div>
    )
}
