'use client'
import React from 'react'
import { Button } from '../ui/button'
import { useFormContext } from 'react-hook-form'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useStepperNavigation } from '@/hooks/useStepperNavigation'

export default function StepperButtonComponent() {
  const { formState } = useFormContext()
  const {
    isFirstStep,
    isLastStep,
    isFinalScreen,
    submitButtonText,
    handlePreviousStep
  } = useStepperNavigation()

  if (isFinalScreen) return null

  return (
    <div className="flex justify-end gap-3 mb-24 md:mb-0">
      {!isFirstStep && (
        <Button
          className="bg-[#1B4D5B]"
          type="button"
          onClick={handlePreviousStep}
        >
          Précédent
        </Button>
      )}

      <Button
        className="bg-[#1B4D5B]"
        type="submit"
        disabled={formState.isSubmitting}
      >
        {isLastStep ? (
          formState.isSubmitting ? (
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
