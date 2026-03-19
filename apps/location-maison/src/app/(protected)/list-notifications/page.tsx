import SectionNotifications from '@/components/notifications/SectionNotifications'
import AppMobileStickyHeader from '@/components/shared/AppMobileStickyHeader'
import React from 'react'

export default function page() {
    return (
        <div className='space-y-4 mb-20'>
            <AppMobileStickyHeader
                title='Mes notifications'
                mobileOnly={false}
                className='bg-white dark:bg-gray-900 px-5 py-3 md:pt-4 pb-4'
            />
            <SectionNotifications />
        </div>
    )
}
