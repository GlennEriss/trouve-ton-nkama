import React from 'react'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { PhoneInput } from '../ui/phone-input'
import { FieldValues, UseFormReturn, Path } from 'react-hook-form'
import { cn } from '@/lib/utils'

type PhoneNumberFormProps<T extends FieldValues> = {
    form: UseFormReturn<T>;
    name: Path<T>;
    label?: string;
    description?: string;
    placeholder?: string;
    className?: string;
    classNameItem?: string;
    classNameLabel?: string;
    classNameControl?: string;
    classNameDescription?: string;
}
export const PhoneNumberForm = <T extends FieldValues>({
    form,
    label,
    description,
    placeholder,
    name,
    className,
    classNameItem,
    classNameLabel,
    classNameControl,
    classNameDescription
}: PhoneNumberFormProps<T>) => {
    return (
        <Form {...form}>
            <FormField
                control={form.control}
                name={name}
                render={({ field, formState: { isSubmitting } }) => (
                    <FormItem className={cn(classNameItem, "flex flex-col items-start")}>
                        <FormLabel className={cn(classNameLabel, "text-left")}>{label}</FormLabel>
                        <FormControl className={cn(classNameControl, "w-full")}>
                            <PhoneInput disabled={isSubmitting} className={className} placeholder={placeholder} {...field} />
                        </FormControl>
                        <FormDescription className={cn(classNameDescription, "text-left")}>
                            {description}
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </Form>
    )
}
