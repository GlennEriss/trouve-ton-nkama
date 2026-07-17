'use client'
import { usePropertyFormComponentContext } from '@/providers/property.form.provider'
import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form'
import { FormElement } from '@/builders/property-form/property.form.builder'

type Step2Props = {
    data: FormElement[]
}
export default function Step2({ data }: Readonly<Step2Props>) {
    const { form } = usePropertyFormComponentContext()
    return (
        <div className='grid md:grid-cols-2 md:gap-5'>
            {
                data.map((item) =>
                    <FormField
                        key={item.name}
                        control={form.control}
                        name={item.name}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-lg text-[#1B4D5B] font-bold'>{item.label}</FormLabel>
                                <FormControl>
                                    <item.component field={field} form={form} />
                                </FormControl>
                                <FormDescription>
                                    {item.description}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )
            }
        </div>
    )
}
