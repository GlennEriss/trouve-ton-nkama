import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { usePropertyFormStorage } from '@/hooks/usePropertyFormStorage'
import { ProcessedFormData } from '@/services/ai-form.service'
import AIFormServiceFactory from '@/factories/services/AIFormServiceFactory'
import useAIAssistant from '@/hooks/useAIAssistant'

interface UseFormAIHandlerProps {
  propertyType: string
  propertyLabel: string
  requiredFields: string[]
  formContext?: any
  form?: any // React Hook Form instance
  isUpdate?: boolean
}

export function useFormAIHandler({
  propertyType,
  propertyLabel,
  requiredFields,
  formContext,
  form,
  isUpdate = false
}: UseFormAIHandlerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const { sendMessage, creditsAvailable, isLoading } = useAIAssistant()
  
  // Utiliser le hook de stockage existant
  const { saveFormToLocalStorage } = usePropertyFormStorage(form, isUpdate, propertyType as any)

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
      console.error('Erreur génération automatique:', error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async (description: string) => {
    try {
      const formData = await generateFormData(description)

      if (formData) {
        // Afficher un toast de succès
        toast({
          title: "✅ Formulaire généré avec succès !",
          description: `Titre: ${formData.title} | Superficie: ${formData.area} m² | Prix: ${formData.price?.toLocaleString()} FCFA. La page va se recharger pour afficher les nouvelles données.`,
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
