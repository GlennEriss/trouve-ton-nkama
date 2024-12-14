import React from 'react'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Button } from '../ui/button'
import { PhoneInput } from '../ui/phone-input'

type PhoneNumberFormProps = {
    form: any,
    label?: string,
    description?: string,
    placeholder?: string,
    name: string,
}
export const PhoneNumberForm: React.FC<PhoneNumberFormProps> = ({
    form,
    label,
    description,
    placeholder,
    name
}) => {
    return (
        <Form {...form}>
            <FormField
                control={form.control}
                name={name}
                render={({ field }) => (
                    <FormItem className="flex flex-col items-start">
                        <FormLabel className="text-left">{label}</FormLabel>
                        <FormControl className="w-full">
                            <PhoneInput placeholder={placeholder} {...field} />
                        </FormControl>
                        <FormDescription className="text-left">
                            {description}
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </Form>
    )
}
