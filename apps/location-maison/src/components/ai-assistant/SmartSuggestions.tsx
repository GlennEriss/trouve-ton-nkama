'use client'

import React from 'react';
import { Button } from '@trouve-ton-nkama/ui/button';
import { Lightbulb, MessageSquare, DollarSign, MapPin, FileText, Wand2 } from 'lucide-react';
import usePropertyType from '@/hooks/usePropertyType';

interface SmartSuggestionsProps {
  activeStep?: number;
  formData?: any;
  onSuggestionClick: (suggestion: string) => void;
  disabled?: boolean;
}

interface Suggestion {
  icon: React.ReactElement;
  text: string;
  prompt: string;
  isSpecial?: boolean;
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  activeStep = 0,
  formData,
  onSuggestionClick,
  disabled = false
}) => {
  const { propertyType, propertyLabel, requiredFields, isPropertyForm } = usePropertyType();

  const getSuggestionsForStep = (step: number): Suggestion[] => {
    const baseSuggestions: Suggestion[] = (() => {
      switch (step) {
        case 0: // Étape 1 - Informations générales
          return [
            {
              icon: <FileText className="w-3 h-3" />,
              text: "Améliorer ma description",
              prompt: formData?.description 
                ? `Améliore cette description : "${formData.description}"` 
                : "Comment bien décrire ma propriété ?"
            },
            {
              icon: <DollarSign className="w-3 h-3" />,
              text: "Estimation de prix",
              prompt: "Aide-moi à estimer le prix de ma propriété"
            },
            {
              icon: <Lightbulb className="w-3 h-3" />,
              text: "Suggérer des tags",
              prompt: "Quels tags recommandes-tu pour ma propriété ?"
            }
          ];

        case 1: // Étape 2 - Détails de la propriété
          return [
            {
              icon: <MessageSquare className="w-3 h-3" />,
              text: "Optimiser les détails",
              prompt: "Comment optimiser les détails de ma propriété pour attirer plus d'acheteurs ?"
            },
            {
              icon: <Lightbulb className="w-3 h-3" />,
              text: "Caractéristiques à valoriser",
              prompt: "Quelles caractéristiques de ma propriété devrais-je mettre en avant ?"
            }
          ];

        case 2: // Étape 3 - Localisation
          return [
            {
              icon: <MapPin className="w-3 h-3" />,
              text: "Valoriser ma localisation",
              prompt: formData?.city ?? formData?.province
                ? `Comment valoriser la localisation ${formData.city ?? ''} ${formData.province ?? ''} ?`
                : "Comment bien présenter la localisation de ma propriété ?"
            },
            {
              icon: <Lightbulb className="w-3 h-3" />,
              text: "Points d'intérêt à mentionner",
              prompt: "Quels points d'intérêt devrais-je mentionner pour ma localisation ?"
            }
          ];

        case 3: // Étape 4 - Aperçu
          return [
            {
              icon: <FileText className="w-3 h-3" />,
              text: "Analyser mon annonce",
              prompt: "Analyse mon annonce complète et donne-moi des conseils d'amélioration"
            },
            {
              icon: <Lightbulb className="w-3 h-3" />,
              text: "Optimiser pour la vente",
              prompt: "Comment optimiser mon annonce pour vendre/louer plus rapidement ?"
            }
          ];

        default:
          return [
            {
              icon: <MessageSquare className="w-3 h-3" />,
              text: "Comment commencer ?",
              prompt: "Comment bien commencer à remplir mon formulaire de propriété ?"
            },
            {
              icon: <Lightbulb className="w-3 h-3" />,
              text: "Conseils généraux",
              prompt: "Donne-moi des conseils généraux pour créer une bonne annonce immobilière"
            }
          ];
      }
    })();

    // Ajouter la suggestion de génération automatique si on est sur un formulaire de propriété
    if (isPropertyForm && propertyType && propertyLabel) {
      const autoFillSuggestion: Suggestion = {
        icon: <Wand2 className="w-3 h-3" />,
        text: `Générer mon ${propertyLabel}`,
        prompt: `AUTO_FILL_PROPERTY:${propertyType}`,
        isSpecial: true
      };

      // Ajouter en première position sauf pour l'étape aperçu
      if (step !== 3) {
        return [autoFillSuggestion, ...baseSuggestions];
      }
    }

    return baseSuggestions;
  };

  const suggestions = getSuggestionsForStep(activeStep);
  const stepNames = ['Informations générales', 'Détails', 'Localisation', 'Aperçu'];

  return (
    <div className="border-t bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-700 flex items-center">
          <Lightbulb className="w-3 h-3 mr-1 text-yellow-500" />
          Suggestions pour l'étape : {stepNames[activeStep] ?? 'Générale'}
          {isPropertyForm && propertyLabel && (
            <span className="ml-2 text-teal-600">({propertyLabel})</span>
          )}
        </p>
      </div>

      {/* Suggestion spéciale de génération automatique */}
      {isPropertyForm && propertyType && propertyLabel && (
        <div className="mb-3 p-3 bg-gradient-to-r from-teal-100 to-emerald-100 rounded-lg border border-teal-200">
          <p className="text-xs text-teal-800 mb-2 font-medium">
            ✨ Générateur automatique pour {propertyLabel}
          </p>
          <p className="text-xs text-teal-700 mb-2">
            Décrivez votre {propertyLabel} et l'IA remplira automatiquement le formulaire avec :
          </p>
          <p className="text-xs text-teal-600">
            {requiredFields.slice(0, 4).join(', ')}...
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.text}
            variant="outline"
            size="sm"
            onClick={() => onSuggestionClick(suggestion.prompt)}
            disabled={disabled}
            className={`
              text-xs h-8 px-3 flex items-center space-x-1
              ${suggestion.isSpecial 
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-teal-300 hover:from-teal-600 hover:to-emerald-600' 
                : 'bg-white hover:bg-teal-50 border-teal-200'
              }
            `}
          >
            {suggestion.icon}
            <span>{suggestion.text}</span>
          </Button>
        ))}
      </div>
      
      {/* Suggestions contextuelles supplémentaires */}
      {formData && Object.keys(formData).length > 0 && (
        <div className="mt-2 pt-2 border-t border-teal-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSuggestionClick("Analyse complète de mon formulaire avec suggestions d'amélioration")}
            disabled={disabled}
            className="text-xs h-7 px-2 hover:bg-teal-100"
            style={{ color: '#156B66' }}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Analyse complète du formulaire
          </Button>
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions; 