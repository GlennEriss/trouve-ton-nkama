import { Input } from '@/components/ui/input'
import { LucideIcon, Eye, EyeOff } from 'lucide-react'
import React, { useState } from 'react'

type InputAppProps = {
    IconLucide?: LucideIcon
    IconColorFill?: string,
    IconColor?: string
} & React.ComponentProps<"input">

export const InputApp: React.FC<InputAppProps> = ({
    IconLucide,
    IconColorFill,
    IconColor,
    type,
    ...props
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = type === 'password';
    
    const togglePasswordVisibility = () => setShowPassword(!showPassword);
    
    return (
        <div className="border border-gray-200 bg-gray-50 dark:bg-gray-900 rounded-full flex py-2 px-4 items-center group transition-colors focus-within:border-[#1FA89B] relative">
            {IconLucide && (
                <IconLucide
                    size={30}
                    fill={IconColorFill ?? 'none'}
                    color={IconColor}
                    className='transition-colors group-focus-within:stroke-[#1FA89B]'
                />
            )}
            <Input 
                className="border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent flex-1 pr-8" 
                type={isPasswordField && showPassword ? 'text' : type}
                {...props} 
            />
            {isPasswordField && (
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={props.disabled}
                >
                    {showPassword ? (
                        <EyeOff size={18} />
                    ) : (
                        <Eye size={18} />
                    )}
                </button>
            )}
        </div>
    )
}
