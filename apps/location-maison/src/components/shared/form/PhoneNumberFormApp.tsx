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
                    <div className='border border-gray-200 bg-gray-50 p-2 rounded-full focus-within:border-[#1FA89B] focus-within:bg-[#ebf6f5]'>
                        <FormControl>
                            <PhoneInput
                                defaultCountry='GA'
                                disabled={isSubmitting}
                                triggerClassName=' border-none shadow-none rounded-full'
                                className='border-none shadow-none focus-visible:ring-0 rounded-full'
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
