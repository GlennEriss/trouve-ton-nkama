'use client'
import React from 'react'
import { steps, usePropertyFormComponentContext } from '@/providers/property.form.provider'
import { Separator } from '../ui/separator'
import clsx from 'clsx'
import { AiOutlineCheck } from 'react-icons/ai'

export default function StepperComponent() {
    const { activeStep, setActiveStep } = usePropertyFormComponentContext()
    const handleChangeStep = (index: number) => {
        if(activeStep > index){
            setActiveStep(index)
        }
    }
    return (
        <div className='grid grid-cols-5 md:grid-cols-7 lg:grid-cols-9 items-center'>
            {
                steps.map((step, index) => (
                    <React.Fragment key={index}>
                        <div className={clsx({
                            'flex justify-start': index === 0,
                            'flex justify-center': index === 1,
                            'flex justify-end': index === 2,
                        })}>
                            <div 
                            onClick={() => handleChangeStep(index)}
                            className={clsx({
                                'rounded-full border-2 border-[#1B4D5B] text-[#1B4D5B] cursor-pointer text-2xl flex justify-center items-center h-10 w-10 md:h-20 md:w-20': activeStep == index,
                                'rounded-full border-2 border-[#1B4D5B] bg-[#1B4D5B] cursor-pointer text-2xl flex justify-center items-center h-10 w-10 md:h-20 md:w-20': activeStep > index,
                                'rounded-full border-2  text-2xl text-gray-400 flex justify-center items-center h-10 w-10 md:h-20 md:w-20': activeStep < index,
                            })}>
                                {
                                    activeStep > index ? (
                                        <AiOutlineCheck color='white' size={25} />
                                    ) : (
                                        <React.Fragment>
                                            {index + 1}
                                        </React.Fragment>
                                    )
                                }
                            </div>
                        </div>

                        <div className='md:col-span-2 lg:col-span-3'>
                            {
                                index < steps.length - 1 && (
                                    <Separator className={clsx({
                                        'border-2 w-full border-[#1B4D5B]': activeStep > index,
                                        'border-2 w-full': activeStep <= index,
                                    })} />
                                )
                            }
                        </div>
                    </React.Fragment>
                ))
            }
        </div >
    )
}