'use client'
import { FormElement } from '@/builders/property-form/property.form.builder'
import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form'
import { usePropertyFormComponentContext } from '@/providers/property.form.provider'
import clsx from 'clsx'

type Step1Props = {
  data: FormElement[]
}
export default function Step1({ data }: Readonly<Step1Props>) {
  const { form } = usePropertyFormComponentContext()
  return (
    <div className='lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-5'>
      {
        data.map((item, key) =>
          <div
            key={item.name}
            className={clsx({
              'lg:row-span-6': key === 0,
              'lg:col-span-1 xl:col-span-2': key !== 0,
              'lg:col-span-1 xl:col-span-1': key === 3 || key === 4,
            })}
          >
            <FormField
              control={form.control}
              name={item.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-lg text-[#1B4D5B] font-bold'>{item.label}</FormLabel>
                  <FormControl>
                    <item.component />
                  </FormControl>
                  <FormDescription>
                    {item.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )
      }
    </div>
  )
}
