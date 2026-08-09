'use client'
import { usePropertyFormComponentContext } from '@/providers/property.form.provider'
import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form'
import { FormElement } from '@/builders/property-form/property.form.builder'

type Step3Props = {
    data: FormElement[]
}
export default function Step3({ data }: Readonly<Step3Props>) {
    const { form } = usePropertyFormComponentContext()
    return (
        <div className='flex flex-col mx-auto xl:w-1/2'>
            {
                data.map((item) =>
                    <FormField
                        key={item.name}
                        control={form.control}
                        name={item.name}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-lg text-ink font-bold'>{item.label}</FormLabel>
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
