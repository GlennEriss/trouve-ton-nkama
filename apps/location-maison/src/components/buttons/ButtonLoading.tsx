import React from 'react';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react'; // Icône de chargement de Lucide React

type ButtonLoadingProps = React.ComponentProps<'button'>

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  children,
  disabled,
  ...buttonProps
}) => {
  return (
    <Button {...buttonProps} disabled={disabled}>
      {/* Affichage dynamique du contenu */}
      {disabled ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin" size={16} />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
};