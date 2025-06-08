'use client'

import React, { useState } from 'react';
import { Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAIAssistant from '@/hooks/useAIAssistant';
import usePropertyType from '@/hooks/usePropertyType';
import AutoFillModal from './AutoFillModal';
import AIPromptsService from '@/services/ai-prompts.service';

interface FloatingAssistantButtonProps {
  formContext?: any;
}

// Mapping des types de propriété pour le localStorage
const PROPERTY_TYPE_MAPPING: Record<string, string> = {
  'home': 'Home',
  'apartment': 'Apartment', 
  'villa': 'Villa',
  'studio': 'Studio',
  'building': 'Building',
  'desk': 'Desk',
  'shop': 'Shop',
  'kiosk': 'Kiosk',
  'room': 'Room',
  'land': 'Land'
};

// Fonction pour sauvegarder dans le localStorage avec la structure correcte
const saveFormToLocalStorage = (data: any) => {
  if (typeof window !== 'undefined') {
    // On crée une copie des données sans les images
    const { images, ...dataWithoutImages } = data;
    localStorage.setItem('property_form_draft', JSON.stringify(dataWithoutImages));
  }
};

const FloatingAssistantButton: React.FC<FloatingAssistantButtonProps> = ({ formContext }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { sendMessage, creditsAvailable, isLoading } = useAIAssistant();
  const { propertyType, propertyLabel, requiredFields, isPropertyForm } = usePropertyType();

  const handleOpenModal = () => {
    setIsModalOpen(true);
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
            countryCode: 'ma', // Code pays par défaut pour le Maroc
            country: 'Maroc',
            state: 'IN_PROGRESS',
            status: 'FOR_RENT',
            // Détails spécifiques selon le type de propriété
            ...generatedData.propertyDetails
          };

          // Sauvegarder avec la fonction du provider
          saveFormToLocalStorage(formData);

          // Afficher un message de succès
          alert(`✅ Formulaire généré avec succès !\n\nTitre: ${generatedData.title}\nSuperficie: ${generatedData.area} m²\nPrix: ${generatedData.price.toLocaleString()} €\n\nLa page va se recharger pour afficher les nouvelles données.`);

          // Rafraîchir la page pour afficher les nouvelles données
          window.location.reload();

        } catch (parseError) {
          console.error('Erreur parsing JSON:', parseError);
          alert('Erreur lors de l\'analyse de la réponse de l\'IA. Veuillez réessayer.');
        }
      } else {
        alert(`Erreur lors de la génération automatique: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur génération automatique:', error);
      alert('Erreur inattendue lors de la génération automatique');
    }
  };

  // N'afficher le bouton que si on est sur un formulaire de propriété
  if (!isPropertyForm || !propertyType || !propertyLabel) {
    return null;
  }

  return (
    <>
      <div className="fixed top-6 right-6 md:top-auto md:bottom-6 z-50">
        {/* Bouton principal */}
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