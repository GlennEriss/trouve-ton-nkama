import React, { ReactNode } from 'react'
import { FormField, FormItem, FormControl, FormLabel, FormDescription, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@trouve-ton-nkama/ui/checkbox'
import { UseFormReturn, Path, FieldValues } from 'react-hook-form'
import { cn } from '@/lib/utils'

type CheckboxFormProps<T extends FieldValues> = {
    form: UseFormReturn<T>;
    name: Path<T>;
    label?: string;
    labelElement?: ReactNode;  // Permet d'ajouter des liens dans le label
    description?: string;
    classNameItem?: string;
    classNameDiv?: string;
    className?: string;
}

export const CheckboxForm = <T extends FieldValues>({
    form,
    label,
    labelElement,
    description,
    name,
    classNameItem,
    classNameDiv,
    className
}: CheckboxFormProps<T>) => {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => (
                <FormItem>
                    <div className={cn(classNameItem, "flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow")}>
                        <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className={className}
                                disabled={isSubmitting}
                            />
                        </FormControl>
                        <div className={cn(classNameDiv, "space-y-1 leading-none")}>
                            {/* Si `labelElement` est fourni, on l'affiche. Sinon, on affiche `label` en texte brut */}
                            <FormLabel>
                                {labelElement ?? label}
                            </FormLabel>
                            <FormDescription>
                                {description}
                            </FormDescription>
                        </div>
                    </div>
                    <FormMessage/>
                </FormItem>
            )}
        />
    )
}