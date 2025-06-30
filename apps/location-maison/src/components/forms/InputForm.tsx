import React, { useState } from 'react';
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputFormProps<T extends FieldValues> = {
    form: UseFormReturn<T>;
    name: Path<T>;
    label?: string;
    description?: string;
    type?: string;
    placeholder?: string;
    className?: string;
    classNameDiv?: string;
    classNameButton?: string;
    sizeIcon?: string;
    disabled?: boolean;
};

export const InputForm = <T extends FieldValues>({
    form,
    name,
    label,
    description,
    type = 'text',
    placeholder,
    className,
    classNameDiv,
    classNameButton,
    sizeIcon,
    disabled,
}: InputFormProps<T>) => {
    const [showPassword, setShowPassword] = useState(false);
    const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
    const isPasswordField = type === 'password';
    
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => {
                const isInputDisabled = isSubmitting || disabled;
                return (
                    <FormItem>
                        {label && <FormLabel>{label}</FormLabel>}
                        <FormControl>
                            <div className={cn(classNameDiv, "relative")}>
                                <Input
                                    {...field}
                                    type={isPasswordField && showPassword ? 'text' : type}
                                    placeholder={placeholder}
                                    className={cn(className, 'pr-10')}
                                    disabled={isInputDisabled}
                                />
                                {/* Toggle password visibility icon */}
                                {isPasswordField && (
                                    <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className={cn(classNameButton, "absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700")}
                                        disabled={isSubmitting}
                                    >
                                        {showPassword ? <EyeOff size={sizeIcon ?? 20} /> : <Eye size={sizeIcon ?? 20} />}
                                    </button>
                                )}
                            </div>
                        </FormControl>
                        {description && <FormDescription>{description}</FormDescription>}
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    );
};