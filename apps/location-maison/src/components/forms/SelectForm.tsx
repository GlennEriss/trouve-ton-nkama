import { Link } from 'lucide-react'
import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form'
import { UseFormReturn } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
type OptionType = {
    value: string,
    label: string
}
type SelectFormProps = {
    form: UseFormReturn<any>;
    name: string,
    options: OptionType[];
    label?: string;
    description?: string;
    placeholder?: string;
    classNameTrigger?: string;
    classNameValue?: string;
    classNameContent?: string;
    classNameItem?: string
}
export const SelectForm: React.FC<SelectFormProps> = ({
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
}) => {
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
