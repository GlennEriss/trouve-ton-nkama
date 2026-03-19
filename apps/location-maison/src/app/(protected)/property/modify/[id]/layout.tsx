import StepperComponent from '@/components/stepper/StepperComponent'
import TitleComponent from '@/components/shared/TitleComponent'
import React from 'react'
import StepperButtonComponent from '@/components/stepper/StepperButtonComponent'
import ModifyPropertyWithProvider from '@/components/property/ModifyPropertyWithProvider'
import AppMobileStickyHeader from '@/components/shared/AppMobileStickyHeader'

export default function layout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className='space-y-4 mb-20'>
            <AppMobileStickyHeader
                title={<TitleComponent className='text-xl text-gray-900 dark:text-white' />}
                className='px-5 py-4 bg-white dark:bg-gray-900'
            />
            <ModifyPropertyWithProvider>
                <div className='flex flex-col gap-4 px-4'>
                    <div className="hidden md:block">
                        <TitleComponent />
                    </div>
                    <StepperComponent />
                    {children}
                    <StepperButtonComponent />
                </div>
            </ModifyPropertyWithProvider>
        </div>
    )
}
