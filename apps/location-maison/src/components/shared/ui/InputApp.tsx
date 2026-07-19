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
        <div className="min-h-12 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-full flex py-2 pl-4 pr-2 items-center group transition-colors focus-within:border-[#1FA89B] relative">
            {IconLucide && (
                <IconLucide
                    size={30}
                    fill={IconColorFill ?? 'none'}
                    color={IconColor}
                    className='transition-colors group-focus-within:stroke-[#1FA89B]'
                />
            )}
            <Input 
                className="min-h-11 border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent flex-1 pr-12"
                type={isPasswordField && showPassword ? 'text' : type}
                {...props} 
            />
            {isPasswordField && (
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146B67]"
                    disabled={props.disabled}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={showPassword}
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
