'use client'
import React from 'react'
import { Button } from '../ui/button'
import { usePropertyFormComponentContext } from '@/providers/property.form.provider'
import { useFormContext } from 'react-hook-form'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useToast } from '@/hooks/use-toast';
import useLastpath from '@/hooks/use-lastpath'
import { TypePropertyEnum } from '@/constantes/property-type'

export default function StepperButtonComponent() {
  const { toast } = useToast();
  const { activeStep, setActiveStep } = usePropertyFormComponentContext()
  const { formState } = useFormContext()
  //pathnames
  const id = useLastpath()
  const TypePropertyList = Object.values(TypePropertyEnum);
  const handleNextStep = () => {
    setActiveStep(prev => prev + 1)
  }
  React.useEffect(() => {
    if (
      activeStep === 2 &&
      Object.keys(formState.errors).length > 0
    ) {
      toast({
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
        onClick={() => setActiveStep(prev => prev - 1)}>
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
                TypePropertyList.includes(id as any) ? 'Enregistrer': 'Modifier'
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
