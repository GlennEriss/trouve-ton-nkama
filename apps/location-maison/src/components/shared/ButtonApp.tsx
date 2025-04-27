import React from 'react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'

type ButtonAppProps = {
    title: string,
} & React.ButtonHTMLAttributes<HTMLButtonElement>
export const ButtonApp: React.FC<ButtonAppProps> = ({ title, className, ...props }) => {
    return (
        <Button className={cn('w-full rounded-full text-md py-6', className)} {...props}>
            {title}
        </Button>
    )
}
