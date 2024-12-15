import React from 'react'
import { FormField, FormItem, FormControl, FormLabel, FormDescription } from '../ui/form'
import { Checkbox } from '../ui/checkbox'
import { UseFormReturn, Path, FieldValues } from 'react-hook-form'
import { cn } from '@/lib/utils'

type CheckboxFormProps<T extends FieldValues> = {
    form: UseFormReturn<T>;
    name: Path<T>;
    label?: string;
    description?: string;
    classNameItem?: string;
    classNameDiv?: string;
    className?: string
}
export const CheckboxForm = <T extends FieldValues>({
    form,
    label,
    description,
    name,
    classNameItem,
    classNameDiv,
    className
}: CheckboxFormProps<T>) => {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem className={cn(classNameItem, "flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow")}>
                    <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className={className}
                        />
                    </FormControl>
                    <div className={cn(classNameDiv, "space-y-1 leading-none")}>
                        <FormLabel>
                            {label}
                        </FormLabel>
                        <FormDescription>
                            {description}
                        </FormDescription>
                    </div>
                </FormItem>
            )}
        />
    )
}
