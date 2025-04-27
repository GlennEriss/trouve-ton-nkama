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
        <div className="border border-gray-200 bg-gray-50 rounded-full flex py-2 px-4 items-center">
            {IconLucide && (
                <IconLucide
                    size={30}
                    fill={IconColorFill}
                    color={IconColor}
                />
            )}
            <Input className="border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400" {...props} />
        </div>
    )
}
