import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import React from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'

type OptionType = {
    value: string,
    label: string
}
type SelectFormAppProps<T extends FieldValues> = {
    control: Control<T>,
    name: Path<T>,
    options: OptionType[],
    label?: string,
    placeholder?: string
} & React.ComponentProps<'select'>
export const SelectFormApp = <T extends FieldValues>({
    control,
    name,
    options,
    label,
    placeholder,
    ...props
}: SelectFormAppProps<T>) => {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => (
                <FormItem>
                    <FormLabel className='text-md'>{label}</FormLabel>
                    <Select
                        open={isOpen}
                        onOpenChange={setIsOpen}
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSubmitting}
                    >
                        <FormControl>
                            <SelectTrigger
                                className={cn(
                                    'rounded-full transition-colors border-white focus:ring-0 focus:border-[#1FA89B] focus:bg-[#ebf6f5] group py-6 text-md bg-gray-50 dark:bg-gray-900 dark:text-white',
                                    isOpen ? 'border-[#1FA89B] bg-[#ebf6f5]' : ''
                                )}
                                classNameIcon={cn(
                                    "transition-colors",
                                    isOpen ? "stroke-[#1FA89B]" : "group-focus-within:stroke-[#1FA89B]"
                                )}                            >
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {
                                options.map((option, key) => (
                                    <SelectItem key={key} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                </FormItem>
            )} />
    )
}
