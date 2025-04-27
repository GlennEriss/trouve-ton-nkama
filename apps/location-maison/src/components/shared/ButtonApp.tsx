import React from 'react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined
type ButtonAppProps = {
    title: string,
    variant?: Variant
} & React.ButtonHTMLAttributes<HTMLButtonElement>
export const ButtonApp: React.FC<ButtonAppProps> = ({ variant, title, className, ...props }) => {
    return (
        <Button variant={variant} className={cn('w-full rounded-full text-md py-6', className)} {...props}>
            {title}
        </Button>
    )
}
