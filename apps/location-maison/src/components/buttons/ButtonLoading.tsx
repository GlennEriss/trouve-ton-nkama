import React from 'react';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react'; // Icône de chargement de Lucide React

type ButtonLoadingProps = React.ComponentProps<'button'> & {
  isLoading: boolean; // Indique si le bouton est en état de chargement
};

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  children,
  isLoading,
  ...buttonProps
}) => {
  return (
    <Button {...buttonProps} disabled={isLoading || buttonProps.disabled}>
      {/* Affichage dynamique du contenu */}
      {isLoading ? (
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