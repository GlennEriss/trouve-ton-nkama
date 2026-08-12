import React from 'react'
import { Button } from '@trouve-ton-nkama/ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'; 

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined
type ButtonAppProps = {
    title: string,
    variant?: Variant,
    colorSpinner?: string,
    isLoading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>
export const ButtonApp: React.FC<ButtonAppProps> = ({ isLoading, colorSpinner, variant, title, className, ...props }) => {
    return (
        <Button variant={variant} className={cn('w-full rounded-full text-md py-6', className)} {...props}>
            {
                isLoading && (
                    <div className="flex items-center space-x-2">
                        <Loader2 className="animate-spin" color={colorSpinner} size={16} />
                    </div>
                )
            }
            {title}
        </Button>
    )
}
