import { usePropertyFormComponentContext } from '@/providers/property.form.provider'
import useLastpath from '@/hooks/use-lastpath'
import { TypePropertyEnum } from '@/constantes/property-type'

/**
 * Hook pour gérer la navigation du stepper
 * Extrait la logique de navigation et les états du StepperButtonComponent
 */
export function useStepperNavigation() {
  const { activeStep, setActiveStep, typeProperty } = usePropertyFormComponentContext()
  const propertyTypeId = useLastpath()

  const handlePreviousStep = () => {
    // Utiliser le typeProperty du contexte (pour les modifications) ou de l'URL (pour les créations)
    const currentTypeProperty = typeProperty || propertyTypeId
        
    if (currentTypeProperty.toLowerCase() === 'land' && activeStep === 2) {
      setActiveStep(0)
    } else {
      setActiveStep(prev => prev - 1)
    }
  }

  const isLastStep = activeStep === 2
  const isFirstStep = activeStep === 0
  const isFinalScreen = activeStep === 3

  const submitButtonText = Object.values(TypePropertyEnum).includes(propertyTypeId as any)
    ? 'Enregistrer'
    : 'Modifier'

  return {
    activeStep,
    isFirstStep,
    isLastStep,
    isFinalScreen,
    submitButtonText,
    handlePreviousStep,
  }
}
