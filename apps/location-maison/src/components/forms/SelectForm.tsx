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
    disabled?: boolean;
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
    disabled = false,
    classNameTrigger,
    classNameValue,
    classNameContent,
    classNameItem
}: SelectFormProps<T>) => {
    const handleOnValueChange = (value: any) => {
        if(value){
            form.setValue(name, value)
            // Déclencher la validation du champ parent immédiatement
            const parentName = name.split('.')[0] as Path<T>;
            form.trigger(parentName);
        }
      };
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Select disabled={isSubmitting || disabled} onValueChange={handleOnValueChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger className={classNameTrigger}>
                                <SelectValue className={classNameValue} placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className={classNameContent}>
                            {
                                options.map((option) => (
                                    <SelectItem key={option.value} className={classNameItem} value={option.value}>
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
