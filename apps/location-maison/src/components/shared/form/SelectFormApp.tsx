import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { OptionType } from '@/models/OptionType'
import React from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'

type SelectFormAppProps<T extends FieldValues> = {
    control: Control<T>,
    name: Path<T>,
    options: OptionType[],
    label?: string,
    placeholder?: string,
    disabled?: boolean,
    onValueChange?: (value: string) => void
} & Omit<React.ComponentProps<'select'>, 'name'>

export const SelectFormApp = <T extends FieldValues>({
    control,
    name,
    options,
    label,
    placeholder,
    disabled,
    onValueChange,
    ...props
}: SelectFormAppProps<T>) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => {
                // Normaliser la valeur (convertir les chaînes vides en undefined)
                const fieldValue = field.value === '' ? undefined : field.value;
                
                // Trouver l'option correspondante à la valeur sélectionnée
                const selectedOption = fieldValue ? options.find(option => option.value === fieldValue) : null;
                
                return (
                    <FormItem>
                        <FormLabel className='text-md'>{label}</FormLabel>
                        <Select
                            value={fieldValue || ''}
                            onValueChange={(value) => {
                                // Convertir les chaînes vides en undefined pour react-hook-form
                                const normalizedValue = value === '' ? undefined : value;
                                field.onChange(normalizedValue);
                                
                                // Appeler le callback du mediator si fourni
                                if (onValueChange) {
                                    onValueChange(value);
                                }
                            }}
                            disabled={Boolean(isSubmitting) || Boolean(disabled)}
                        >
                            <FormControl>
                                <SelectTrigger
                                    aria-label={props['aria-label'] || label || placeholder || String(name)}
                                    className={cn(
                                        'min-h-12 rounded-full transition-colors border-[#1FA89B] focus:ring-0 focus:border-[#1FA89B] focus:bg-[#ebf6f5] group py-3 text-md bg-gray-50 dark:bg-gray-900 dark:text-white'
                                    )}
                                >
                                    <SelectValue placeholder={placeholder}>
                                        {selectedOption ? selectedOption.label : placeholder}
                                    </SelectValue>
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {options.map((option) => (
                                    <SelectItem 
                                        key={option.value} 
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    )
}
