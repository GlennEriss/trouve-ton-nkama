'use client'
import { usePropertyFormComponentContext } from '@/providers/property.form.provider'
import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form'
import { FormElement } from '@/builders/property-form/property.form.builder'
import { useFormContext } from 'react-hook-form'

type Step3Props = {
    data: FormElement[]
}
export default function Step3({ data }: Step3Props) {
    const { form } = usePropertyFormComponentContext()
    const {getValues} = useFormContext()
    console.log(getValues())
    return (
        <div className='flex flex-col mx-auto xl:w-1/2'>
            {
                data.map((item, key) =>
                    <FormField
                        key={key}
                        control={form.control}
                        name={item.name}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-lg text-[#1B4D5B] font-bold'>{item.label}</FormLabel>
                                <FormControl>
                                    {item.component(field)}
                                </FormControl>
                                <FormDescription>
                                    {item.description}                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )
            }
        </div>
    )
}

