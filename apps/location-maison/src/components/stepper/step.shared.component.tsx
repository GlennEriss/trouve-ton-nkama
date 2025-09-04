/**
 * Shared Components for the Property Form.
 * 
 * These components handle various types of form inputs (text, textarea, and number)
 * that are shared across multiple steps of the form.
 * 
 * Components in this section:
 * 
 * - **TextComponent**: A text input field used for any single-line text inputs.
 * - **TextareaComponent**: A textarea input field used for multi-line text inputs.
 * - **NumberComponent**: A numeric input field for accepting numbers (e.g., property area or price).
 * 
 * Usage: These components are reusable across different steps of the form and can be bound to different fields using the `field` prop.
 */
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"

//Texte
export const TextComponent = ({ field }: { field: any }) => {
    return (
        <Input type='text' {...field} />
    )
}

//TextArea
export const TextareaComponent = ({ field }: { field: any }) => {
    return (
        <Textarea {...field} />
    )
}

//Number
export const NumberComponent = ({ field }: { field: any }) => {
    return (
        <Input 
        min={0} 
        type='number' 
        {...field} 
        onChange={(e) => field.onChange(parseFloat(e.target.value))}
        />
    )
}

//Select
export const SelectComponent = ({ field }: { field: any}) => {
    return (
        <></>
    )
}