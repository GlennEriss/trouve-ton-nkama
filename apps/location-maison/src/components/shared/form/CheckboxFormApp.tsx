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
                <FormItem className='flex gap-2'>
                    <FormControl className='mt-2.5'>
                        <Checkbox
                            className="data-[state=checked]:bg-[#1FA89B] data-[state=checked]:border-[#1FA89B]"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                        />
                    </FormControl>
                    <div className={"leading-none"}>
                        <FormLabel>
                            {label}
                        </FormLabel>
                    </div>
                </FormItem>

            )}
        />
    )
}
