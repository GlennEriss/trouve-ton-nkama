import { Input } from '@/components/ui/input'
import { LucideIcon } from 'lucide-react'
import React from 'react'

type InputAppProps = {
    IconLucide?: LucideIcon
    IconColorFill?: string,
    IconColor?: string
} & React.ComponentProps<"input">

export const InputApp: React.FC<InputAppProps> = ({
    IconLucide,
    IconColorFill,
    IconColor,
    ...props
}) => {
    return (
        <div className="border border-gray-200 bg-gray-50 dark:bg-gray-900 rounded-full flex py-2 px-4 items-center group transition-colors focus-within:border-[#1FA89B]">
            {IconLucide && (
                <IconLucide
                    size={30}
                    fill={IconColorFill}
                    color={IconColor}
                    className='transition-colors group-focus-within:stroke-[#1FA89B]'
                />
            )}
            <Input className="border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent" {...props} />
        </div>
    )
}
