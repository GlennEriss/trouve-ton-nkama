import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PhoneInput, PhoneInputProps } from '@/components/ui/phone-input'
import React from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'

type PhoneNumberFormAppProps<T extends FieldValues> = {
    control: Control<T>,
    name: Path<T>,
    label?: string
} & PhoneInputProps
export const PhoneNumberFormApp = <T extends FieldValues>({
    control,
    name,
    label,
    ...props
}: PhoneNumberFormAppProps<T>) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => (
                <FormItem>
                    <FormLabel className="text-md">{label}</FormLabel>
                    <div className='border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 rounded-full focus-within:border-[#1FA89B] focus-within:bg-[#ebf6f5] dark:focus-within:bg-gray-800'>
                        <FormControl>
                            <PhoneInput
                                defaultCountry='GA'
                                disabled={isSubmitting}
                                triggerClassName=' border-none shadow-none rounded-full'
                                className='border-none shadow-none focus-visible:ring-0 rounded-full dark:text-white dark:placeholder:text-gray-500 bg-transparent'
                                {...props}
                                {...field}
                            />
                        </FormControl>
                    </div>
                    <FormMessage/>
                </FormItem>
            )}
        />
    )
}
