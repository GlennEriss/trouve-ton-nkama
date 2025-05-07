import { Input } from '@/components/ui/input'
import { LucideIcon } from 'lucide-react'
import React, { useState } from 'react'
import { FiPlus, FiMinus } from 'react-icons/fi'

type InputNumberAppProps = {
    IconLucide?: LucideIcon
    IconColorFill?: string,
    IconColor?: string
    step?: number
    personalizedOnChange?: (value: number) => void
} & React.ComponentProps<"input">

export const InputNumberApp: React.FC<InputNumberAppProps> = ({
    IconLucide,
    IconColorFill,
    IconColor,
    step = 1,
    ...props
}) => {
    const [value, setValue] = useState<number>(Number(props.defaultValue) || 0)

    React.useEffect(() => {
        if (props.personalizedOnChange) {
            props.personalizedOnChange(value)
        }
    }, [value])

    const increment = () => setValue((prev) => prev + step)
    const decrement = () => setValue((prev) => Math.max(0, prev - step))
    
    return (
        <div className="border border-gray-200 bg-gray-50 dark:bg-gray-900 rounded-full flex py-2 px-4 items-center group transition-colors focus-within:border-[#1FA89B]">
            <button type="button" onClick={decrement} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
                <FiMinus />
            </button>
            {IconLucide && (
                <IconLucide
                    size={30}
                    fill={IconColorFill}
                    color={IconColor}
                    className='mx-2 transition-colors group-focus-within:stroke-[#1FA89B]'
                />
            )}
            <Input
                type='number'
                value={value}
                onChange={(e) => {
                    const inputValue = Number(e.target.value)
                    if (!isNaN(inputValue)) {
                        setValue(inputValue)
                    }
                }}
                className="mx-2 text-center w-3/5 border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent"
                {...props}
            />
            <button type="button" onClick={increment} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-white border hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
                <FiPlus />
            </button>
        </div>
    )
}
