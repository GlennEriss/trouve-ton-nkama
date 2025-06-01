import React from 'react'
import { InputNumberApp } from '../ui/InputNumberApp'
import { Control, FieldValues, Path } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

type InputFormNumberAppProps<T extends FieldValues> = {
    control: Control<T>,
    name: Path<T>,
    label: string,
    placeholder: string,
    step?: number,
} & React.ComponentProps<"input">

export default function InputFormNumberApp<T extends FieldValues>({ control, name, label, placeholder, step = 1, ...props }: InputFormNumberAppProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => (
                <FormItem>
                    <FormLabel className='text-md'>{label}</FormLabel>
                    <InputNumberApp
                        {...props}
                        {...field}
                        disabled={isSubmitting}
                        step={step}
                        personalizedOnChange={(value) => {
                            field.onChange(value)
                        }}
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}
