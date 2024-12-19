import StepperComponent from '@/components/stepper/StepperComponent'
import TitleComponent from '@/components/shared/TitleComponent'
import { PropertyFormComponentProvider } from '@/providers/property.form.provider'
import React from 'react'
import StepperButtonComponent from '@/components/stepper/StepperButtonComponent'

export default function layout({ children }: { children: React.ReactNode }) {
    return (
        <PropertyFormComponentProvider>
            <div className='flex flex-col gap-4'>
                <TitleComponent />
                <StepperComponent />
                {children}
                <StepperButtonComponent/>
            </div>
        </PropertyFormComponentProvider>
    )
}
