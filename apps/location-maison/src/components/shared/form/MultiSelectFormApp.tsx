import { FormMessage, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { MultiSelect } from '@/components/shared/ui/MultiSelectApp'
import React from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'

type OptionType = {
    label: string,
    value: string
}
type MultiSelectFormAppProps<T extends FieldValues> = {
    control: Control<T>,
    name: Path<T>,
    options: OptionType[],
    placeholder?: string,
    label?: string,
    className?: string
}
export default function MultiSelectFormApp<T extends FieldValues>({ control, name, options, placeholder, label, className }: MultiSelectFormAppProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <MultiSelect
                            options={options}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            placeholder={placeholder}
                            variant="inverted"
                            animation={2}
                            maxCount={3}
                            className={className}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}
