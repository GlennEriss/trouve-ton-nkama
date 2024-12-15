import { Link } from 'lucide-react'
import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form'
import { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
type OptionType = {
    value: string,
    label: string
}
type SelectFormProps<T extends FieldValues> = {
    form: UseFormReturn<T>;
    name: Path<T>;
    options: OptionType[];
    label?: string;
    description?: string;
    placeholder?: string;
    classNameTrigger?: string;
    classNameValue?: string;
    classNameContent?: string;
    classNameItem?: string
}
export const SelectForm = <T extends FieldValues>({
    form,
    label,
    description,
    name,
    options,
    placeholder,
    classNameTrigger,
    classNameValue,
    classNameContent,
    classNameItem
}: SelectFormProps<T>) => {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger className={classNameTrigger}>
                                <SelectValue className={classNameValue} placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className={classNameContent}>
                            {
                                options.map((option, key) => (
                                    <SelectItem className={classNameItem} key={key} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                    <FormDescription>
                        {description}
                    </FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}
