'use client'
import React from 'react'
import { Button } from '../ui/button'
import { usePropertyFormComponentContext } from '@/providers/property.form.provider'
import { useFormContext } from 'react-hook-form'
import { LoadingSpinner } from '../shared/LoadingSpinner'

export default function StepperButtonComponent() {
  const { activeStep, setActiveStep } = usePropertyFormComponentContext()
  const { getValues, formState } = useFormContext()
  const handleNextStep = () => {
    setActiveStep(prev => prev + 1)
  }
  if(activeStep===3){
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
                'Enregistrer'
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
