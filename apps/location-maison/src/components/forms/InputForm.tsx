import React, { useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { UseFormReturn } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputFormProps = React.ComponentProps<'input'> & {
    form: UseFormReturn<any>;
    label?: string;
    description?: string;
};

export const InputForm: React.FC<InputFormProps> = ({
    form,
    label,
    description,
    name,
    type,
    className,
    ...inputProps
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    const isPasswordField = type === 'password';

    return (
        <FormField
            control={form.control}
            name={name || ''}
            render={({ field }) => (
                <FormItem>
                    {label && <FormLabel>{label}</FormLabel>}
                    <FormControl>
                        <div className="relative">
                            {/* Input field */}
                            <Input
                                {...inputProps}
                                {...field}
                                type={isPasswordField && showPassword ? 'text' : type}
                                className={cn(className,"pr-10")}
                            />

                            {/* Toggle password visibility icon */}
                            {isPasswordField && (
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            )}
                        </div>
                    </FormControl>
                    {description && <FormDescription>{description}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};