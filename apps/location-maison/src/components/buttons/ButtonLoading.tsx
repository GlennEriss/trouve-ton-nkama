import React from 'react';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react'; // Icône de chargement de Lucide React

type ButtonLoadingProps = React.ComponentProps<'button'> & {
  colorSpinner?: string;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  children,
  disabled,
  colorSpinner,
  ...buttonProps
}) => {
  return (
    <Button {...buttonProps} disabled={disabled}>
      {/* Affichage dynamique du contenu */}
      {disabled ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin" color={colorSpinner} size={16} />
        </div>
      ) : (
        children
      )}
    </Button>
  );
};