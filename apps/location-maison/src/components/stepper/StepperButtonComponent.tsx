'use client'
import React from 'react'
import { Button } from '../ui/button'
import { usePropertyFormComponentContext } from '@/providers/property.form.provider'
import { useFormContext } from 'react-hook-form'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useToast } from '@/hooks/use-toast';
import useLastpath from '@/hooks/use-lastpath'
import { TypePropertyEnum } from '@/constantes/property-type'
import { 
  Step1Schema, 
  Step2Schema, 
  Step3Schema,
  HomeStep2Schema,
  StudioStep2Schema,
  ApartmentStep2Schema,
  VillaStep2Schema,
  DeskStep2Schema,
  BuildingStep2Schema
} from '@/models/schema'
import { z } from 'zod'

export default function StepperButtonComponent() {
  const { toast } = useToast();
  const { activeStep, setActiveStep } = usePropertyFormComponentContext()
  const { formState, getValues, trigger } = useFormContext()
  //pathnames
  const id = useLastpath()
  const TypePropertyList = Object.values(TypePropertyEnum);
  
  const getSubmitButtonText = (id: string): string => {
    return TypePropertyList.includes(id as any) ? 'Enregistrer' : 'Modifier';
  };

  // Fonction pour obtenir le schéma approprié selon le step et le type de propriété
  const getStepSchema = (step: number) => {
    switch (step) {
      case 0:
        return Step1Schema;
      case 1:
        const values = getValues();
        const propertyType = values.propertyType;
        
        switch (propertyType) {
          case 'home':
            return HomeStep2Schema;
          case 'studio':
            return StudioStep2Schema;
          case 'apartment':
            return ApartmentStep2Schema;
          case 'villa':
            return VillaStep2Schema;
          case 'desk':
            return DeskStep2Schema;
          case 'building':
            return BuildingStep2Schema;
          default:
            // Si pas de type défini, utiliser un schéma vide
            return z.object({});
        }
      case 2:
        return Step3Schema;
      default:
        return z.object({});
    }
  };

  // Fonction pour valider le step actuel
  const validateCurrentStep = async (): Promise<boolean> => {
    try {
      const schema = getStepSchema(activeStep);
      const values = getValues();
      
      // Définir les champs selon le step
      let stepFields: string[] = [];
      
      switch (activeStep) {
        case 0: // Step 1
          stepFields = ['images', 'title', 'description', 'area', 'price', 'status', 'tags'];
          break;
        case 1: // Step 2
          const propertyType = values.propertyType;
          switch (propertyType) {
            case 'home':
              stepFields = ['nbrRooms', 'nbrChickens', 'nbrBathrooms', 'nbrToilets', 'nbrGarages', 'nbrFloors'];
              break;
            case 'studio':
              stepFields = ['nbrRooms', 'nbrChickens', 'nbrBathrooms', 'nbrToilets', 'nbrFloorStudio', 'numeroStudio'];
              break;
            case 'apartment':
              stepFields = ['nbrRooms', 'nbrChickens', 'nbrBathrooms', 'nbrToilets', 'nbrFloorApartment', 'numeroApartment'];
              break;
            case 'villa':
              stepFields = ['nbrRooms', 'nbrChickens', 'nbrBathrooms', 'nbrToilets', 'nbrFloors', 'nbrPiscine', 'nbrGarages'];
              break;
            case 'desk':
              stepFields = ['nbrToilets', 'nbrRooms'];
              break;
            case 'building':
              stepFields = ['nbrAppartement', 'nbrFloors', 'hasParking'];
              break;
            default:
              stepFields = ['propertyType'];
          }
          break;
        case 2: // Step 3
          stepFields = ['street', 'city', 'province', 'additionalInformation', 'longitude', 'latitude', 'country', 'countryCode'];
          break;
      }
      
      const stepData: any = {};
      stepFields.forEach(field => {
        if (values[field] !== undefined) {
          stepData[field] = values[field];
        }
      });

      // Valider avec le schéma
      schema.parse(stepData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Afficher les erreurs de validation avec plus de détails
        const errorMessages = error.errors.map(err => {
          const fieldName = err.path.join('.');
          return `${fieldName}: ${err.message}`;
        }).join('\n');
        
        console.log('Erreurs de validation:', error.errors); // Debug
        
        toast({
          duration: 8000,
          title: "Erreur de validation",
          description: (
            <div className="space-y-1">
              <p className="font-medium">Veuillez corriger les erreurs suivantes :</p>
              <div className="text-sm space-y-1">
                {error.errors.map((err, index) => (
                  <p key={index} className="text-red-600">
                    • {err.path.join('.')}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          ),
          variant: "destructive",
        });
      } else {
        console.error('Erreur de validation inattendue:', error);
        toast({
          duration: 5000,
          title: "Erreur de validation",
          description: "Une erreur inattendue s'est produite lors de la validation",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleNextStep = async () => {
    // Cas spécial pour 'land' qui passe directement de step 0 à step 2
    if (id === 'land' && activeStep === 0) {
      setActiveStep(2);
      return;
    }

    // Valider le step actuel avant de passer au suivant
    const isValid = await validateCurrentStep();
    
    if (isValid) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (id === 'land' && activeStep === 2) {
      setActiveStep(0); // revenir directement à Step1
    } else {
      setActiveStep(prev => prev - 1);
    }
  };

  React.useEffect(() => {
    if (
      activeStep === 2 &&
      Object.keys(formState.errors).length > 0
    ) {
      toast({
        duration: 5000,
        title: "Erreur dans le formulaire",
        description: "Le formulaire contient des erreurs. Veuillez corriger les erreurs avant de continuer.",
        variant: "destructive",
      });
    }
  }, [activeStep, formState.submitCount, formState.errors])

  if (activeStep === 3) {
    return null
  }

  return (
    <div className='flex justify-end gap-3'>
      <Button
        className='bg-[#1B4D5B]'
        type='button'
        disabled={activeStep === 0}
        onClick={handlePreviousStep}>
        Précédent
      </Button>
      {
        activeStep == 2 && (
          <Button
            className='bg-[#1B4D5B]'
            type='submit'
            disabled={formState.isSubmitting}
          >
            {
              formState.isSubmitting ? (
                <>
                  <LoadingSpinner /> Création...
                </>
              ) : (
                getSubmitButtonText(id)
              )
            }
          </Button>
        )
      }
      {
        activeStep < 2 && (
          <Button
            className='bg-[#1B4D5B]'
            type='button'
            disabled={activeStep === 2}
            onClick={handleNextStep}>
            Suivant
          </Button>
        )
      }
    </div>
  )
}
