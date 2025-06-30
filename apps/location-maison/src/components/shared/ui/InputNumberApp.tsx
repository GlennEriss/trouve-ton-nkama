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
    ({ className, type, onChange, ...props }, ref) => {
        const [value, setValue] = React.useState<number>(props.defaultValue as number || 0);

        React.useEffect(() => {
            onChange?.(value);
        }, [value, onChange]);

        const increment = () => {
            setValue(prev => prev + (props.step as number || 1));
        };

        const decrement = () => {
            setValue(prev => Math.max(0, prev - (props.step as number || 1)));
        };

        return (
            <div className="relative">
                <Input
                    type={type}
                    className={cn(
                        "pr-20",
                        className
                    )}
                    ref={ref}
                    value={value}
                    onChange={(e) => {
                        const newValue = Number(e.target.value);
                        setValue(newValue);
                    }}
                    {...props}
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-full px-3 hover:bg-gray-100"
                        onClick={decrement}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-full px-3 hover:bg-gray-100"
                        onClick={increment}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }
);
