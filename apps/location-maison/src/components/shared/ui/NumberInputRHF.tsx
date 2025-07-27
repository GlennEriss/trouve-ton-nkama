import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

export interface NumberInputRHFProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

// CSS pour masquer les spin buttons natifs
const inputNumberNoSpin = `
  [&::-webkit-outer-spin-button]:appearance-none
  [&::-webkit-inner-spin-button]:appearance-none
  [&::-webkit-outer-spin-button]:m-0
  [&::-webkit-inner-spin-button]:m-0
  appearance-none
  moz-appearance:textfield
`;

export const NumberInputRHF = React.forwardRef<HTMLInputElement, NumberInputRHFProps>(
  ({ value, onChange, min, max, step = 1, className, disabled, ...props }, ref) => {
    // Convertit la valeur en nombre ou undefined
    const numericValue = value === '' || value === undefined || value === null ? undefined : Number(value);

    // Incrémentation
    const handleIncrement = () => {
      if (typeof numericValue === 'number' && !isNaN(numericValue)) {
        const next = Math.min(max ?? Infinity, numericValue + step);
        onChange(next);
      } else if (min !== undefined) {
        onChange(min);
      } else {
        onChange(step);
      }
    };

    // Décrémentation
    const handleDecrement = () => {
      if (typeof numericValue === 'number' && !isNaN(numericValue)) {
        const next = Math.max(min ?? 0, numericValue - step);
        onChange(next);
      } else if (min !== undefined) {
        onChange(min);
      } else {
        onChange(0);
      }
    };

    // Saisie utilisateur
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === '') {
        onChange(NaN); // Permet d'effacer
      } else {
        const num = Number(val);
        if (!isNaN(num)) {
          onChange(num);
        }
      }
    };

    return (
      <div className="relative">
        <input
          type="number"
          ref={ref}
          className={cn('pr-20 w-full min-w-0', inputNumberNoSpin, className)}
          value={numericValue === undefined || isNaN(numericValue) ? '' : numericValue}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-full px-3 hover:bg-gray-100"
            onClick={handleDecrement}
            disabled={disabled || (typeof numericValue === 'number' && min !== undefined && numericValue <= min)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-full px-3 hover:bg-gray-100"
            onClick={handleIncrement}
            disabled={disabled || (typeof numericValue === 'number' && max !== undefined && numericValue >= max)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
);

NumberInputRHF.displayName = 'NumberInputRHF'; 