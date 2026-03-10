import { TypePropertyEnum } from '@/constantes/property-type'
import AIPromptsService from './ai-prompts.service'

export interface AIFormData {
  title: string
  description: string
  price: number | string
  area: number | string
  tags: string[]
  propertyDetails: Record<string, any>
}

export interface ProcessedFormData {
  title: string
  description: string
  price: number
  area: number
  tags: string[]
  status: string
  address: {
    district: string
    city: string
    province: string
  }
  longitude: number
  latitude: number
  countryCode: string
  country: string
  additionnalInformation: string
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
  private static readonly MAX_USER_DESCRIPTION_LENGTH = 2500

  private static readonly DEFAULT_TAGS = ['Famille', 'Calme et tranquillité', 'Parking']

  private extractPrice(description: string): number {
    const normalized = description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    const budgetMatch =
      normalized.match(/(?:budget|prix|max(?:imum)?|a|à)\s*[:=]?\s*(\d[\d\s.,]*)\s*(?:fcfa|xaf|f cfa)?/) ??
      normalized.match(/(\d[\d\s.,]{3,})\s*(?:fcfa|xaf|f cfa)/)

    if (!budgetMatch?.[1]) return 0
    const cleaned = budgetMatch[1].replace(/[^\d]/g, '')
    const value = Number.parseInt(cleaned || '0', 10)
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  private extractArea(description: string): number {
    const normalized = description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    const areaMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metres?\s*carres?)/)
    if (!areaMatch?.[1]) return 0
    const area = Number.parseFloat(areaMatch[1].replace(',', '.'))
    return Number.isFinite(area) && area > 0 ? Math.round(area) : 0
  }

  private extractRooms(description: string): number {
    const normalized = description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    const roomsMatch = normalized.match(/(\d+)\s*(?:chambre|chambres|piece|pieces)/)
    if (!roomsMatch?.[1]) return 0
    const rooms = Number.parseInt(roomsMatch[1], 10)
    return Number.isFinite(rooms) && rooms > 0 ? rooms : 0
  }

  private buildDefaultPropertyDetails(propertyType: string, rooms: number): Record<string, unknown> {
    switch (propertyType) {
      case 'home':
        return {
          nbrRooms: rooms,
          nbrChickens: 1,
          nbrBathrooms: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrToilets: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrGarages: 0,
          nbrFloors: 1,
          nbrLivingRoom: 1,
        }
      case 'apartment':
        return {
          nbrRooms: rooms,
          nbrChickens: 1,
          nbrBathrooms: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrToilets: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrFloorApartment: 0,
          numeroApartment: '',
        }
      case 'villa':
        return {
          nbrRooms: rooms,
          nbrChickens: 1,
          nbrBathrooms: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrToilets: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrFloors: 1,
          nbrPiscine: 0,
          nbrGarages: 0,
        }
      case 'studio':
        return {
          nbrRooms: rooms > 0 ? rooms : 1,
          nbrChickens: 1,
          nbrBathrooms: 1,
          nbrToilets: 1,
          nbrFloorStudio: 0,
          numeroStudio: '',
        }
      case 'building':
        return {
          nbrApartments: 0,
          nbrFloors: 1,
          hasParking: false,
        }
      case 'desk':
        return {
          nbrToilets: 1,
          nbrRooms: rooms,
        }
      case 'shop':
        return {
          nbrRooms: rooms,
          nbrToilet: 1,
        }
      case 'kiosk':
        return {
          kioskType: '',
        }
      case 'room':
        return {
          roomType: '',
        }
      default:
        return {
          additionalInfo: '',
        }
    }
  }

  private buildFallbackAIData(propertyType: string, propertyLabel: string, description: string): AIFormData {
    const safeDescription = description.trim().slice(0, AIFormService.MAX_USER_DESCRIPTION_LENGTH)
    const price = this.extractPrice(safeDescription)
    const area = this.extractArea(safeDescription)
    const rooms = this.extractRooms(safeDescription)

    return {
      title: `${propertyLabel ? propertyLabel.charAt(0).toUpperCase() + propertyLabel.slice(1) : 'Bien'} ${rooms > 0 ? `${rooms} chambre${rooms > 1 ? 's' : ''}` : ''}`.trim(),
      description: safeDescription,
      price,
      area,
      tags: AIFormService.DEFAULT_TAGS,
      propertyDetails: this.buildDefaultPropertyDetails(propertyType, rooms),
    }
  }

  /**
   * Crée le prompt spécialisé pour l'IA
   */
  createPrompt(
    propertyType: string,
    propertyLabel: string,
    requiredFields: string[],
    description: string
  ): string {
    const boundedDescription = description.trim().slice(0, AIFormService.MAX_USER_DESCRIPTION_LENGTH)

    return AIPromptsService.getAutoFillPrompt(
      propertyType,
      propertyLabel,
      requiredFields,
      boundedDescription
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
    // Normaliser le prix
    let priceNum: number
    if (typeof data.price === 'string') {
      const cleaned = data.price.replace(/[^0-9]/g, '')
      priceNum = parseInt(cleaned || '0', 10)
    } else {
      priceNum = data.price
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) priceNum = 0

    // Normaliser la surface
    let areaNum: number
    if (typeof data.area === 'string') {
      const cleanedArea = String(data.area).replace(/[^0-9.]/g, '')
      areaNum = parseFloat(cleanedArea || '0')
    } else {
      areaNum = data.area
    }
    if (!Number.isFinite(areaNum) || areaNum < 0) areaNum = 0

    return {
      ...data,
      price: priceNum,
      area: areaNum
    }
  }

  /**
   * Transforme les données IA en format de formulaire
   */
  transformToFormData(
    data: AIFormData,
    propertyType: string
  ): ProcessedFormData {
    // S'assurer que price et area sont des nombres au moment de la transformation
    const normalizedPrice = typeof data.price === 'string'
      ? parseInt(data.price.replace(/[^0-9]/g, '') || '0', 10)
      : (Number.isFinite(data.price) ? data.price : 0)

    const normalizedArea = typeof data.area === 'string'
      ? parseFloat(String(data.area).replace(/[^0-9.]/g, '') || '0')
      : (Number.isFinite(data.area) ? data.area : 0)

    return {
      // Champs principaux du formulaire
      title: data.title,
      description: data.description,
      price: normalizedPrice,
      area: normalizedArea,
      tags: data.tags,
      status: 'FOR_SALE', // Valeur par défaut
      
      // Structure address pour le formulaire
      address: {
        district: '',
        city: '',
        province: ''
      },
      
      // Champs de localisation
      longitude: 0,
      latitude: 0,
      countryCode: 'GA',
      country: 'Gabon',
      
      // Informations additionnelles
      additionnalInformation: '',
      
      // Détails spécifiques à la propriété
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
