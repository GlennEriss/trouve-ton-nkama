import StepperComponent from '@/components/stepper/StepperComponent'
import TitleComponent from '@/components/shared/TitleComponent'
import { PropertyFormComponentProvider } from '@/providers/property.form.provider'
import React from 'react'
import StepperButtonComponent from '@/components/stepper/StepperButtonComponent'
import ModifyPropertyWithProvider from '@/components/property/ModifyPropertyWithProvider'

export default function layout({ children }: { children: React.ReactNode }) {
    return (
        <div className='space-y-4 mb-20'>
            <div className='sticky top-0 md:static z-50 bg-white px-5 py-4 shadow border-b flex items-center justify-between md:hidden'>
                <TitleComponent />
            </div>
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
