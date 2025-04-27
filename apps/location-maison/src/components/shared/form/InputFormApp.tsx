import React from 'react'
import { InputApp } from '../ui/InputApp'
import { LucideIcon } from 'lucide-react'
import { FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Control, FieldValues, Path } from 'react-hook-form'

type InputFormAppProps<T extends FieldValues> = {
    control: Control<T>,
    name: Path<T>,
    IconLucide?: LucideIcon
    IconColorFill?: string,
    IconColor?: string
    label?: string
} & React.ComponentProps<"input">

export const InputFormApp = <T extends FieldValues>({
    IconLucide,
    IconColorFill,
    IconColor,
    control,
    name,
    label,
    ...props
}: InputFormAppProps<T>) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel className='text-md'>{label}</FormLabel>
                    <InputApp
                        IconLucide={IconLucide}
                        IconColorFill={IconColorFill}
                        IconColor={IconColor}
                        {...props} />
                </FormItem>

            )}
        />
    )
}
