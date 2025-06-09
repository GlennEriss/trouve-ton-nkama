import React from 'react'
import { InputNumberApp } from '../ui/InputNumberApp'
import { Control, FieldValues, Path } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'

interface InputFormNumberAppProps<T extends FieldValues = any> {
    control: Control<T>;
    name: Path<T>;
    label: string;
    placeholder?: string;
    step?: number;
    min?: number;
    max?: number;
    required?: boolean;
    className?: string;
}

const InputFormNumberApp = <T extends FieldValues = any>({
    control,
    name,
    label,
    placeholder,
    step = 1,
    min,
    max,
    required = false,
    className,
}: InputFormNumberAppProps<T>) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={className}>
                    <FormLabel>
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                    <FormControl>
                        <InputNumberApp
                            placeholder={placeholder}
                            step={step}
                            min={min}
                            max={max}
                            onChange={(value) => field.onChange(value)}
                            defaultValue={field.value}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};

export default InputFormNumberApp;
