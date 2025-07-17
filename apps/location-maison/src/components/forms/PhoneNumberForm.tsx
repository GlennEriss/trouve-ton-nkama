import React from 'react'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { PhoneInput } from '../ui/phone-input'
import { FieldValues, UseFormReturn, Path } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { PhoneValidationMessage } from './PhoneValidationMessage'
import { getEnabledCountries } from '@/lib/phoneValidation'

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
    disabled?: boolean;
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
    classNameDescription,
    disabled
}: PhoneNumberFormProps<T>) => {
    // Obtenir le premier pays activé comme pays par défaut
    const enabledCountries = getEnabledCountries();
    const defaultCountry = enabledCountries.length > 0 ? enabledCountries[0].code as any : 'GA';

    return (
        <Form {...form}>
            <FormField
                control={form.control}
                name={name}
                render={({ field, formState: { isSubmitting } }) => (
                    <FormItem className={cn(classNameItem, "flex flex-col items-start")}>
                        <FormLabel className={cn(classNameLabel, "text-left")}>{label}</FormLabel>
                        <FormControl className={cn(classNameControl, "w-full")}>
                            <PhoneInput 
                                defaultCountry={defaultCountry} 
                                disabled={isSubmitting || disabled} 
                                className={cn(className, 'border rounded-lg')} 
                                placeholder={placeholder} 
                                {...field} 
                            />
                        </FormControl>
                        <FormDescription className={cn(classNameDescription, "text-left")}>
                            {description}
                        </FormDescription>
                        <FormMessage />
                        <PhoneValidationMessage phoneNumber={field.value} />
                    </FormItem>
                )}
            />
        </Form>
    )
}
