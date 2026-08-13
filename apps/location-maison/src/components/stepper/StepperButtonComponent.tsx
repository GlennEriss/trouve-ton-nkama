'use client'

import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { usePropertyFormComponentContext } from '@/providers/property-form.context'
import { useStepperNavigation } from '@/hooks/useStepperNavigation'
import { Button } from '@trouve-ton-nkama/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trouve-ton-nkama/ui/dialog'
import { LoadingSpinner } from '../shared/LoadingSpinner'

export default function StepperButtonComponent() {
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false)
  const [isResetting, setIsResetting] = React.useState(false)
  const { formState } = useFormContext()
  const { isFinalSubmitting, isUpdate, resetPropertyForm } = usePropertyFormComponentContext()
  const {
    isFirstStep,
    isLastStep,
    isFinalScreen,
    submitButtonText,
    handlePreviousStep,
  } = useStepperNavigation()

  if (isFinalScreen) return null

  // La dernière étape ne passe pas par `form.handleSubmit` (soumission asynchrone gérée
  // par le provider), donc `formState.isSubmitting` de react-hook-form ne la reflète
  // jamais : on utilise `isFinalSubmitting` du provider à la place pour ce cas précis.
  const isSubmitting = isLastStep ? isFinalSubmitting : formState.isSubmitting
  const isBusy = isSubmitting || isResetting

  const handleConfirmReset = async () => {
    setIsResetting(true)
    try {
      await resetPropertyForm()
      setIsResetDialogOpen(false)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <>
      <div
        className={`flex flex-col gap-3 mb-24 sm:flex-row sm:items-center ${isUpdate ? 'sm:justify-end' : 'sm:justify-between'} md:mb-0`}
      >
        {!isUpdate && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-auto"
            onClick={() => setIsResetDialogOpen(true)}
            disabled={isBusy}
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {!isFirstStep && (
            <Button
              className="min-h-11 w-full bg-ink text-white sm:w-auto"
              type="button"
              onClick={handlePreviousStep}
              disabled={isBusy}
            >
              Précédent
            </Button>
          )}

          <Button
            className="min-h-11 w-full bg-ink text-white sm:w-auto"
            type="submit"
            disabled={isBusy}
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
      </div>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left text-gray-900 dark:text-gray-100">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              Réinitialiser le formulaire ?
            </DialogTitle>
            <DialogDescription className="text-left">
              Tous les champs saisis, les images ajoutées et le brouillon sauvegardé seront supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResetDialogOpen(false)}
              disabled={isResetting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <LoadingSpinner className="h-4 w-4" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
