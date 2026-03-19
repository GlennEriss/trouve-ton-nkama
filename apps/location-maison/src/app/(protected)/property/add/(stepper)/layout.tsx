import StepperComponent from '@/components/stepper/StepperComponent'
import TitleComponent from '@/components/shared/TitleComponent'
import { PropertyFormComponentProvider } from '@/providers/property.form.provider'
import React from 'react'
import StepperButtonComponent from '@/components/stepper/StepperButtonComponent'
import AppMobileStickyHeader from '@/components/shared/AppMobileStickyHeader'

export default function layout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className='space-y-4 mb-10'>
            <AppMobileStickyHeader
                title={<TitleComponent className='text-xl text-gray-900 dark:text-white' />}
                className='px-5 py-4 bg-white dark:bg-gray-900'
            />
            <PropertyFormComponentProvider>
                <div className='flex flex-col gap-4 px-6 pb-20 max-w-full overflow-x-hidden'>
                    <div className="hidden md:block">
                        <TitleComponent />
                    </div>
                    <StepperComponent />
                    <div className='max-w-full overflow-x-hidden'>
                    {children}
                    </div>
                    <StepperButtonComponent />
                </div>
            </PropertyFormComponentProvider>
        </div>

    )
}
