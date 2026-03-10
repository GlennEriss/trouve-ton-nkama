import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useToast } from '@/hooks/use-toast'
import { usePropertyFormStorage } from '@/hooks/usePropertyFormStorage'
import { ProcessedFormData } from '@/services/ai-form.service'
import AIFormServiceFactory from '@/factories/services/AIFormServiceFactory'
import useAIAssistant from '@/hooks/useAIAssistant'
import { createLogger } from '@/lib/logger'
import { MAX_IMAGES_UPLOAD } from '@/constantes'

const logger = createLogger('hooks.use-form-ai-handler')

interface UseFormAIHandlerProps {
  propertyType: string
  propertyLabel: string
  requiredFields: string[]
  isUpdate?: boolean
}

export function useFormAIHandler({
  propertyType,
  propertyLabel,
  requiredFields,
  isUpdate = false
}: UseFormAIHandlerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const { sendMessage, creditsAvailable, isLoading } = useAIAssistant()
  
  // Utiliser le formContext pour accéder au formulaire
  const form = useFormContext()
  
  // Utiliser le hook de stockage existant
  const { saveFormToLocalStorage, saveCurrentFormData } = usePropertyFormStorage(form, isUpdate, propertyType as any)

  const generateFormData = async (description: string): Promise<ProcessedFormData | null> => {
    if (!description.trim() || !propertyType || !propertyLabel) {
      throw new Error('Description, type de propriété et label requis')
    }

    setIsGenerating(true)

    try {
      // Utiliser la factory pour obtenir l'instance du service
      const aiFormService = AIFormServiceFactory.getInstance()
      
      // Utiliser le service pour traiter la requête IA
      const formData = await aiFormService.processAIRequest(
        propertyType,
        propertyLabel,
        requiredFields,
        description,
        sendMessage
      )

      // Sauvegarder avec le hook de stockage
      saveFormToLocalStorage(formData)

      return formData
    } catch (error) {
      logger.error('Automatic form generation failed', { error, propertyType })
      throw error
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async (description: string, aiImages: File[] = []) => {
    try {
      if (form && aiImages.length > 0) {
        const currentImages = (form.getValues('images') ?? []) as (File | string)[]
        const mergedImages = [...currentImages, ...aiImages].slice(0, MAX_IMAGES_UPLOAD)
        form.setValue('images', mergedImages, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      }

      const formData = await generateFormData(description)

      if (formData && form) {
        // Debug : afficher les données générées par l'IA
        
        // Appliquer les données générées au formulaire
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            form.setValue(key as any, value)
          }
        })

        // Déclencher la validation pour mettre à jour l'état du formulaire
        form.trigger()

        // Sauvegarder les données actuelles du formulaire dans localStorage
        saveCurrentFormData()

        // Afficher un toast de succès
        toast({
          title: "✅ Formulaire généré avec succès !",
          description: `Titre: ${formData.title} | Superficie: ${formData.area} m² | Prix: ${formData.price?.toLocaleString()} FCFA. Les données ont été appliquées au formulaire.`,
          variant: "success",
        })

        return formData
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue'
      
      toast({
        title: "❌ Erreur de génération",
        description: errorMessage,
        variant: "destructive",
      })
      
      throw error
    }
  }

  return {
    handleGenerate,
    isGenerating: isGenerating || isLoading,
    creditsAvailable,
    canGenerate: creditsAvailable > 0 && !isGenerating && !isLoading
  }
}
