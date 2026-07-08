'use client'
import React from 'react'
import { Button } from '../ui/button'
import { useFormContext } from 'react-hook-form'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useStepperNavigation } from '@/hooks/useStepperNavigation'
import { usePropertyFormComponentContext } from '@/providers/property-form.context'

export default function StepperButtonComponent() {
  const { formState } = useFormContext()
  const { isFinalSubmitting } = usePropertyFormComponentContext()
  const {
    isFirstStep,
    isLastStep,
    isFinalScreen,
    submitButtonText,
    handlePreviousStep
  } = useStepperNavigation()

  if (isFinalScreen) return null

  // La dernière étape ne passe pas par `form.handleSubmit` (soumission asynchrone gérée
  // par le provider), donc `formState.isSubmitting` de react-hook-form ne la reflète
  // jamais : on utilise `isFinalSubmitting` du provider à la place pour ce cas précis.
  const isSubmitting = isLastStep ? isFinalSubmitting : formState.isSubmitting

  return (
    <div className="flex justify-end gap-3 mb-24 md:mb-0">
      {!isFirstStep && (
        <Button
          className="bg-[#1B4D5B]"
          type="button"
          onClick={handlePreviousStep}
          disabled={isSubmitting}
        >
          Précédent
        </Button>
      )}

      <Button
        className="bg-[#1B4D5B]"
        type="submit"
        disabled={isSubmitting}
      >
        {isLastStep ? (
          isSubmitting ? (
            <>
              <LoadingSpinner /> {submitButtonText}...
            </>
          ) : (
            submitButtonText
          )
        ) : (
          'Suivant'
        )}
      </Button>
    </div>
  )
}
