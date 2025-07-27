import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
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
    const { disabled } = props;
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
                        onValueChange={(value) => {
                            field.onChange(value);
                            // Déclencher la validation du champ parent immédiatement
                            const parentName = name.split('.')[0] as Path<T>;
                            // Utiliser form.trigger au lieu de control._trigger
                            // Note: control n'a pas accès direct à trigger, nous devons utiliser le contexte du formulaire
                        }}
                        disabled={Boolean(isSubmitting) || Boolean(disabled)}
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
                                options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
    )
}
