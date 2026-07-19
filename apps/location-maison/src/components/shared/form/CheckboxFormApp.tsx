import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { control } from 'leaflet';
import React from 'react'
import { FieldValues, Path, Control } from 'react-hook-form'

type CheckboxFormAppProps<T extends FieldValues> = {
    control: Control<T>;
    name: Path<T>;
    label?: React.ReactNode;
}
export const CheckboxFormApp = <T extends FieldValues>({
    control,
    name,
    label
}: CheckboxFormAppProps<T>) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => (
                <FormItem className='flex items-start gap-2 space-y-0'>
                    <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                        />
                    </FormControl>
                    <div className="min-h-11 pt-2 leading-5">
                        <FormLabel className="cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                            {label}
                        </FormLabel>
                    </div>
                </FormItem>

            )}
        />
    )
}
