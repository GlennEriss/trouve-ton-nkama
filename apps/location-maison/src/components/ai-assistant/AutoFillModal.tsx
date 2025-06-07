'use client'

import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AutoFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyLabel?: string;
  requiredFields: string[];
  onGenerate: (description: string) => void;
  creditsAvailable: number;
  isLoading?: boolean;
}

const AutoFillModal: React.FC<AutoFillModalProps> = ({
  isOpen,
  onClose,
  propertyLabel = 'propriété',
  requiredFields,
  onGenerate,
  creditsAvailable,
  isLoading = false
}) => {
  const [description, setDescription] = useState('');

  const handleClose = () => {
    setDescription('');
    onClose();
  };

  const handleGenerate = () => {
    if (description.trim()) {
      onGenerate(description.trim());
      setDescription('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Wand2 className="w-5 h-5 mr-2" style={{ color: '#156B66' }} />
            Génération automatique - {propertyLabel}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Décrivez votre {propertyLabel} en détail. L'IA générera automatiquement :
            </p>
            <ul className="text-xs text-gray-500 mb-4 space-y-1 bg-gray-50 p-3 rounded-lg">
              {requiredFields.slice(0, 6).map((field, index) => (
                <li key={index}>• {field}</li>
              ))}
              {requiredFields.length > 6 && <li>• et plus...</li>}
            </ul>
          </div>
          
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Exemple: "Maison de 120m² avec 4 chambres, jardin de 500m², garage double, rénovée en 2020, quartier calme proche des écoles..."`}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              autoFocus
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Conseil: Plus votre description est détaillée, plus le résultat sera précis.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!description.trim() || creditsAvailable <= 0 || isLoading}
              className="px-4 py-2"
              style={{ backgroundColor: '#156B66' }}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {isLoading ? 'Génération...' : 'Générer (1 crédit)'}
            </Button>
          </div>
          
          {creditsAvailable <= 0 && (
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 text-sm">
                Vous n'avez plus de crédits pour utiliser cette fonctionnalité
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoFillModal; 