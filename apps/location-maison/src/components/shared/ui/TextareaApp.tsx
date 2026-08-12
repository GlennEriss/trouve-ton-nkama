import { LucideIcon } from 'lucide-react'
import React from 'react'
import { Textarea } from '@trouve-ton-nkama/ui/textarea'

export type TextareaAppProps = {
    IconLucide?: LucideIcon
    IconColorFill?: string,
    IconColor?: string
} & React.ComponentProps<typeof Textarea>

const TextareaApp: React.FC<TextareaAppProps> = ({
    IconLucide,
    IconColorFill,
    IconColor,
    className,
    ...props
}) => {
    return (
        <div className="border border-gray-200 bg-gray-50 dark:bg-gray-900 rounded-2xl flex py-2 md:px-4 items-start group transition-colors focus-within:border-secondary">
            {IconLucide && (
                <IconLucide
                    size={30}
                    fill={IconColorFill}
                    color={IconColor}
                    className='transition-colors group-focus-within:stroke-secondary mt-1'
                />
            )}
            <Textarea
                className={"border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent flex-1 resize-none outline-none min-h-[80px] ml-2 " + (className || "")}
                {...props}
                rows={props.rows || 8}
            />
        </div>
    )
}

export default TextareaApp
