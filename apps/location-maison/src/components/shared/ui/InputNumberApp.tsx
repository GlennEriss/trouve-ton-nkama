import { Input } from '@/components/ui/input'
import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Minus, Plus, LucideIcon } from 'lucide-react'

type InputNumberAppProps = {
    IconLucide?: LucideIcon
    IconColorFill?: string,
    IconColor?: string
    step?: number
    onChange?: (value: number) => void
} & React.ComponentProps<"input">

export const InputNumberApp = React.forwardRef<HTMLInputElement, InputNumberAppProps>(
    ({ className, type, onChange, value, step, ...props }, ref) => {
        const increment = () => {
            if (typeof value === 'number') {
                const newValue = (value as number) + (step || 1);
                onChange?.(newValue);
            }
        };

        const decrement = () => {
            if (typeof value === 'number') {
                const newValue = Math.max(0, (value as number) - (step || 1));
                onChange?.(newValue);
            }
        };

        return (
            <div className="relative">
                <Input
                    type={type}
                    className={cn(
                        "min-h-12 pr-24",
                        className
                    )}
                    ref={ref}
                    value={value === undefined ? '' : value}
                    onChange={(e) => {
                        const numValue = parseFloat(e.target.value);
                        if (!isNaN(numValue)) {
                            onChange?.(numValue);
                        } else if (e.target.value === '') {
                            onChange?.(0);
                        }
                    }}
                    {...props}
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-full min-w-11 px-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={decrement}
                        aria-label="Diminuer la valeur"
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-full min-w-11 px-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={increment}
                        aria-label="Augmenter la valeur"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }
);
