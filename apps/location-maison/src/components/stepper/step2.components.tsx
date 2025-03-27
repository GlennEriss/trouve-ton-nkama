import React from 'react'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { FormItem, FormControl, FormLabel } from '../ui/form'

type ChoiceComponentProps = {
    field: any,
    data: {value: any , label: string}[]
}
export const ChoiceComponent: React.FC<ChoiceComponentProps> = ({field, data}) => {
    return (
        <RadioGroup
            onValueChange={field.onChange}
            defaultValue={field.value}
            className="flex gap-5"
        >
            {
                data.map((item, key) =>
                    <FormItem key={key} className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                            <RadioGroupItem value={item.value} />
                        </FormControl>
                        <FormLabel className="font-normal">
                            {item.label}
                        </FormLabel>
                    </FormItem>
                )
            }
        </RadioGroup>
    )
}