'use client'

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import useAIAssistant from '@/hooks/useAIAssistant';
import usePropertyType from '@/hooks/usePropertyType';
import AutoFillModal from './AutoFillModal';
import AIPromptsService from '@/services/ai-prompts.service';
import { TypePropertyEnum } from '@/constantes/property-type';

interface FloatingAssistantButtonProps {
  formContext?: any;
}

// Mapping des types de propriété pour le localStorage en utilisant TypePropertyEnum
const PROPERTY_TYPE_MAPPING: Record<string, string> = Object.entries(TypePropertyEnum).reduce(
  (acc, [key, value]) => ({
    ...acc,
    [value]: key.toUpperCase()
  }),
  {}
);

// Fonction pour sauvegarder dans le localStorage avec la structure correcte
const saveFormToLocalStorage = (data: any) => {
  if (typeof window !== 'undefined') {
    try {
      // On crée une copie des données sans les images
      const { images, ...dataWithoutImages } = data;
      
      // Vérification que les données sont valides
      if (!dataWithoutImages || typeof dataWithoutImages !== 'object') {
        console.error('Données invalides pour le localStorage');
        return;
      }

      // Suppression explicite de l'ancienne donnée avant de sauvegarder
      localStorage.removeItem('property_form_draft');
      
      // Sauvegarde des nouvelles données
      localStorage.setItem('property_form_draft', JSON.stringify(dataWithoutImages));
      
      // Vérification que les données ont bien été sauvegardées
      const savedData = localStorage.getItem('property_form_draft');
      if (!savedData) {
        throw new Error('Échec de la sauvegarde dans le localStorage');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde dans le localStorage:', error);
      throw error;
    }
  }
};

const FloatingAssistantButton: React.FC<FloatingAssistantButtonProps> = ({ formContext }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [isWelcomeMessageFading, setIsWelcomeMessageFading] = useState(false);
  const [typedText, setTypedText] = useState('');
  const { sendMessage, creditsAvailable, isLoading } = useAIAssistant();
  const { propertyType, propertyLabel, requiredFields, isPropertyForm } = usePropertyType();
  const { toast } = useToast();

  const welcomeText = "👋 Je suis votre assistant pour vous aider à créer rapidement des annonces !";

  // Animation typewriter pour le message
  React.useEffect(() => {
    if (!showWelcomeMessage) return;

    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex <= welcomeText.length) {
        setTypedText(welcomeText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50); // 50ms entre chaque caractère

    return () => clearInterval(typeInterval);
  }, [showWelcomeMessage]);

  // Faire disparaître le message de bienvenue après que l'écriture soit terminée
  React.useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsWelcomeMessageFading(true);
    }, welcomeText.length * 50 + 3000); // Attendre la fin de l'écriture + 3s

    const hideTimer = setTimeout(() => {
      setShowWelcomeMessage(false);
    }, welcomeText.length * 50 + 4000); // Disparaît 1s après le début du fade

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    // Masquer le message quand l'utilisateur interagit
    setShowWelcomeMessage(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Gérer la génération automatique
  const handleAutoFillProperty = async (description: string) => {
    if (!description.trim() || !propertyType || !propertyLabel) return;

    setIsModalOpen(false);

    try {
      // Créer le prompt spécialisé
      const prompt = AIPromptsService.getAutoFillPrompt(
        propertyType,
        propertyLabel,
        requiredFields,
        description.trim()
      );

      const result = await sendMessage(prompt, formContext);

      if (result.success && result.response) {
        try {
          // Parser la réponse JSON de l'IA
          const cleanedResponse = result.response.replace(/```json\n?|\n?```/g, '').trim();
          const generatedData = JSON.parse(cleanedResponse);

          // Créer la structure de données conforme au localStorage attendu
          const formData = {
            typeProperty: PROPERTY_TYPE_MAPPING[propertyType] || 'Home',
            title: generatedData.title || '',
            description: generatedData.description || '',
            price: generatedData.price || 0,
            area: generatedData.area || 0,
            tags: generatedData.tags || [],
            street: '',
            city: '',
            province: '',
            additionnalInformation: '',
            longitude: 0,
            latitude: 0,
            countryCode: 'ga', // Code pays par défaut pour le Maroc
            country: 'Gabon',
            state: 'IN_PROGRESS',
            status: 'FOR_RENT',
            // Détails spécifiques selon le type de propriété
            ...generatedData.propertyDetails
          };

          // Sauvegarder avec la fonction du provider
          saveFormToLocalStorage(formData);

          // Afficher un toast de succès
          toast({
            title: "✅ Formulaire généré avec succès !",
            description: (
              <div className="space-y-1">
                <p><strong>Titre:</strong> {generatedData.title}</p>
                <p><strong>Superficie:</strong> {generatedData.area} m²</p>
                <p><strong>Prix:</strong> {generatedData.price?.toLocaleString()} €</p>
                <p className="text-sm text-gray-600 mt-2">La page va se recharger pour afficher les nouvelles données.</p>
              </div>
            ),
            variant: "success",
          });

          // Rafraîchir la page après un délai pour laisser le temps au toast d'être lu
          setTimeout(() => {
            window.location.reload();
          }, 3000);

        } catch (parseError) {
          console.error('Erreur parsing JSON:', parseError);
          toast({
            title: "❌ Erreur de traitement",
            description: "Erreur lors de l'analyse de la réponse de l'IA. Veuillez réessayer.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "❌ Erreur de génération",
          description: result.error || "Une erreur s'est produite lors de la génération automatique.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur génération automatique:', error);
      toast({
        title: "❌ Erreur inattendue",
        description: "Une erreur inattendue s'est produite lors de la génération automatique.",
        variant: "destructive",
      });
    }
  };

  // N'afficher le bouton que si on est sur un formulaire de propriété
  if (!isPropertyForm || !propertyType || !propertyLabel) {
    return null;
  }

  return (
    <>
      <div className="fixed top-6 right-6 md:top-auto md:bottom-6 z-50">
        {/* Message de salutation */}
        {showWelcomeMessage && (
          <div className={`mb-3 transition-all duration-1000 ease-out ${
            isWelcomeMessageFading ? 'opacity-0 translate-y-2' : 'opacity-100'
          }`}>
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-xs mr-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {typedText}
                  {typedText.length < welcomeText.length && (
                    <span className="animate-pulse">|</span>
                  )}
                </p>
                {/* Petite flèche pointant vers le bouton - repositionnée */}
                <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800"></div>
              </div>
            </div>
          </div>
        )}

        {/* Conteneur du bouton - aligné à droite */}
        <div className="flex justify-end">
          <Button
            type='button'
            onClick={handleOpenModal}
            disabled={creditsAvailable <= 0}
            className={`
              relative rounded-full w-16 h-16 shadow-lg transition-all duration-300 hover:scale-105
              ${creditsAvailable <= 0 
                ? 'bg-gray-300 hover:bg-gray-300 cursor-not-allowed' 
                : 'hover:opacity-90 active:scale-95'
              }
            `}
            style={{
              backgroundColor: creditsAvailable > 0 ? '#156B66' : undefined
            }}
            size="lg"
          >
            <div className="relative">
              <Bot className="w-7 h-7 text-white" />
              {creditsAvailable > 0 && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
          </Button>
        </div>
      </div>

      {/* Modal de génération automatique */}
      <AutoFillModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        propertyLabel={propertyLabel}
        requiredFields={requiredFields}
        onGenerate={handleAutoFillProperty}
        creditsAvailable={creditsAvailable}
        isLoading={isLoading}
      />
    </>
  );
};

export default FloatingAssistantButton; 