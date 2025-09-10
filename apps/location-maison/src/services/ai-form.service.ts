import { TypePropertyEnum } from '@/constantes/property-type'
import AIPromptsService from './ai-prompts.service'

export interface AIFormData {
  title: string
  description: string
  price: number
  area: number
  tags: string[]
  propertyDetails: Record<string, any>
}

export interface ProcessedFormData {
  typeProperty: string
  title: string
  description: string
  price: number
  area: number
  tags: string[]
  street: string
  city: string
  province: string
  additionnalInformation: string
  longitude: number
  latitude: number
  countryCode: string
  country: string
  state: string
  status: string
  [key: string]: any
}

// Mapping des types de propriété pour le localStorage
const PROPERTY_TYPE_MAPPING: Record<string, string> = Object.entries(TypePropertyEnum).reduce(
  (acc, [key, value]) => ({
    ...acc,
    [value]: key.toUpperCase()
  }),
  {}
)

export class AIFormService {
  /**
   * Crée le prompt spécialisé pour l'IA
   */
  createPrompt(
    propertyType: string,
    propertyLabel: string,
    requiredFields: string[],
    description: string
  ): string {
    return AIPromptsService.getAutoFillPrompt(
      propertyType,
      propertyLabel,
      requiredFields,
      description.trim()
    )
  }

  /**
   * Parse la réponse JSON de l'IA
   */
  parseAIResponse(response: string): AIFormData {
    try {
      const cleanedResponse = response?.replace(/```json\n?|\n?```/g, '').trim() ?? ''
      const generatedData = JSON.parse(cleanedResponse)
      
      return {
        title: generatedData.title ?? '',
        description: generatedData.description ?? '',
        price: generatedData.price ?? 0,
        area: generatedData.area ?? 0,
        tags: generatedData.tags ?? [],
        propertyDetails: generatedData.propertyDetails ?? {}
      }
    } catch (error) {
      throw new Error(`Erreur parsing JSON: ${error}`)
    }
  }

  /**
   * Post-traite les données (prix, superficie, etc.)
   */
  postProcessData(data: AIFormData): AIFormData {
    let price = data.price
    if (typeof price === 'string') {
      price = parseInt(price.replace(/[^0-9]/g, ''), 10)
    }
    if (!price || isNaN(price) || price < 0) price = 0

    let area = data.area
    if (!area || isNaN(area) || area < 0) area = 0

    return {
      ...data,
      price,
      area
    }
  }

  /**
   * Transforme les données IA en format de formulaire
   */
  transformToFormData(
    data: AIFormData,
    propertyType: string
  ): ProcessedFormData {
    return {
      typeProperty: PROPERTY_TYPE_MAPPING[propertyType] ?? 'Home',
      title: data.title,
      description: data.description,
      price: data.price,
      area: data.area,
      tags: data.tags,
      street: '',
      city: '',
      province: '',
      additionnalInformation: '',
      longitude: 0,
      latitude: 0,
      countryCode: 'ga',
      country: 'Gabon',
      state: 'IN_PROGRESS',
      status: 'FOR_RENT',
      ...data.propertyDetails
    }
  }

  /**
   * Pipeline complet : prompt → IA → parsing → post-traitement → format formulaire
   */
  async processAIRequest(
    propertyType: string,
    propertyLabel: string,
    requiredFields: string[],
    description: string,
    sendMessage: (prompt: string, formContext?: any) => Promise<any>
  ): Promise<ProcessedFormData> {
    // 1. Créer le prompt
    const prompt = this.createPrompt(propertyType, propertyLabel, requiredFields, description)
    
    // 2. Appeler l'IA
    const result = await sendMessage(prompt)
    
    if (!result.success || !result.response) {
      throw new Error(result.error ?? "Erreur lors de l'appel à l'IA")
    }
    
    // 3. Parser la réponse
    const parsedData = this.parseAIResponse(result.response)
    
    // 4. Post-traiter
    const processedData = this.postProcessData(parsedData)
    
    // 5. Transformer en format formulaire
    return this.transformToFormData(processedData, propertyType)
  }
}

export default AIFormService
