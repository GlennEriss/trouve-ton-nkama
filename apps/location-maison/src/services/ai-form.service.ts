import AIPromptsService from './ai-prompts.service'

type ListingStatus = 'FOR_RENT' | 'FOR_SALE'

interface AIAddressData {
  district: string
  city: string
  province: string
}

export interface AIFormData {
  title: string
  description: string
  price: number | string
  area: number | string
  tags: string[]
  status?: string
  address?: Partial<AIAddressData>
  longitude?: number | string
  latitude?: number | string
  provinceLon?: number | string
  provinceLat?: number | string
  cityLon?: number | string
  cityLat?: number | string
  streetLon?: number | string
  streetLat?: number | string
  countryCode?: string
  country?: string
  additionnalInformation?: string
  contact?: string
  isOwner?: boolean
  propertyDetails: Record<string, any>
}

export interface ProcessedFormData {
  title: string
  description: string
  price: number
  area: number
  tags: string[]
  status: ListingStatus
  address: AIAddressData
  longitude: number
  latitude: number
  countryCode: string
  country: string
  additionnalInformation: string
  contact?: string
  isOwner?: boolean
  [key: string]: any
}

export class AIFormService {
  private static readonly MAX_USER_DESCRIPTION_LENGTH = 2500

  private toString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
  }

  private normalizeNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.round(value) : 0
    }

    if (typeof value !== 'string') {
      return 0
    }

    const withoutCurrency = value
      .trim()
      .replace(/\s*(?:fcfa|xaf|f\s*cfa|francs?)\s*$/gi, '')
      .replace(/\s+/g, '')

    if (!withoutCurrency || /[a-z]/i.test(withoutCurrency)) {
      return 0
    }

    const normalized = withoutCurrency
      .replace(/(?<=\d)[.,](?=\d{3}\b)/g, '')
      .replace(',', '.')

    const numberValue = Number.parseFloat(normalized)
    return Number.isFinite(numberValue) ? Math.round(numberValue) : 0
  }

  private normalizePositiveNumber(value: unknown): number {
    const numberValue = this.normalizeNumber(value)
    return numberValue >= 0 ? numberValue : 0
  }

  private normalizeStatus(status: unknown): ListingStatus {
    return status === 'FOR_RENT' || status === 'FOR_SALE' ? status : 'FOR_RENT'
  }

  private normalizeTags(tags: unknown): string[] {
    if (!Array.isArray(tags)) {
      return []
    }

    return tags
      .map((tag) => this.toString(tag))
      .filter(Boolean)
      .slice(0, 5)
  }

  private normalizeAddress(address: unknown): AIAddressData {
    if (!address || typeof address !== 'object') {
      return { district: '', city: '', province: '' }
    }

    const data = address as Partial<Record<keyof AIAddressData, unknown>>

    return {
      district: this.toString(data.district),
      city: this.toString(data.city),
      province: this.toString(data.province),
    }
  }

  private extractJsonPayload(response: string): string {
    const cleanedResponse = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    if (cleanedResponse.startsWith('{') && cleanedResponse.endsWith('}')) {
      return cleanedResponse
    }

    const firstBrace = cleanedResponse.indexOf('{')
    const lastBrace = cleanedResponse.lastIndexOf('}')

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return cleanedResponse.slice(firstBrace, lastBrace + 1)
    }

    return cleanedResponse
  }

  /**
   * Cree le prompt specialise pour l'IA.
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
   * Parse uniquement le JSON renvoye par Gemini.
   */
  parseAIResponse(response: string): AIFormData {
    try {
      const generatedData = JSON.parse(this.extractJsonPayload(response))

      return {
        title: this.toString(generatedData.title),
        description: this.toString(generatedData.description),
        price: generatedData.price ?? 0,
        area: generatedData.area ?? 0,
        tags: this.normalizeTags(generatedData.tags),
        status: this.toString(
          generatedData.status ?? generatedData.propertyStatus ?? generatedData.listingStatus
        ),
        address: this.normalizeAddress(generatedData.address),
        longitude: generatedData.longitude ?? 0,
        latitude: generatedData.latitude ?? 0,
        provinceLon: generatedData.provinceLon ?? 0,
        provinceLat: generatedData.provinceLat ?? 0,
        cityLon: generatedData.cityLon ?? 0,
        cityLat: generatedData.cityLat ?? 0,
        streetLon: generatedData.streetLon ?? 0,
        streetLat: generatedData.streetLat ?? 0,
        countryCode: this.toString(generatedData.countryCode) || 'GA',
        country: this.toString(generatedData.country) || 'Gabon',
        additionnalInformation: this.toString(generatedData.additionnalInformation),
        contact: this.toString(generatedData.contact),
        isOwner: typeof generatedData.isOwner === 'boolean' ? generatedData.isOwner : undefined,
        propertyDetails:
          generatedData.propertyDetails && typeof generatedData.propertyDetails === 'object'
            ? generatedData.propertyDetails
            : {},
      }
    } catch (error) {
      throw new Error(`Gemini a renvoye une reponse illisible: ${error}`)
    }
  }

  /**
   * Normalise seulement les types attendus par le formulaire.
   */
  postProcessData(data: AIFormData): AIFormData {
    return {
      ...data,
      price: this.normalizePositiveNumber(data.price),
      area: this.normalizePositiveNumber(data.area),
      tags: this.normalizeTags(data.tags),
      status: this.normalizeStatus(data.status),
      address: this.normalizeAddress(data.address),
      longitude: this.normalizeNumber(data.longitude),
      latitude: this.normalizeNumber(data.latitude),
      provinceLon: this.normalizeNumber(data.provinceLon),
      provinceLat: this.normalizeNumber(data.provinceLat),
      cityLon: this.normalizeNumber(data.cityLon),
      cityLat: this.normalizeNumber(data.cityLat),
      streetLon: this.normalizeNumber(data.streetLon),
      streetLat: this.normalizeNumber(data.streetLat),
      countryCode: this.toString(data.countryCode) || 'GA',
      country: this.toString(data.country) || 'Gabon',
      additionnalInformation: this.toString(data.additionnalInformation),
      contact: this.toString(data.contact),
    }
  }

  /**
   * Transforme les donnees Gemini en format de formulaire.
   */
  transformToFormData(data: AIFormData): ProcessedFormData {
    const address = this.normalizeAddress(data.address)

    return {
      title: data.title,
      description: data.description,
      price: this.normalizePositiveNumber(data.price),
      area: this.normalizePositiveNumber(data.area),
      tags: this.normalizeTags(data.tags),
      status: this.normalizeStatus(data.status),
      address,
      longitude: this.normalizeNumber(data.longitude),
      latitude: this.normalizeNumber(data.latitude),
      provinceLon: this.normalizeNumber(data.provinceLon),
      provinceLat: this.normalizeNumber(data.provinceLat),
      cityLon: this.normalizeNumber(data.cityLon),
      cityLat: this.normalizeNumber(data.cityLat),
      streetLon: this.normalizeNumber(data.streetLon),
      streetLat: this.normalizeNumber(data.streetLat),
      countryCode: this.toString(data.countryCode) || 'GA',
      country: this.toString(data.country) || 'Gabon',
      additionnalInformation: this.toString(data.additionnalInformation),
      contact: this.toString(data.contact) || undefined,
      isOwner: typeof data.isOwner === 'boolean' ? data.isOwner : undefined,
      ...data.propertyDetails,
    }
  }

  /**
   * Pipeline complet : prompt -> Gemini -> parsing -> format formulaire.
   */
  async processAIRequest(
    propertyType: string,
    propertyLabel: string,
    requiredFields: string[],
    description: string,
    sendMessage: (prompt: string, formContext?: any) => Promise<any>
  ): Promise<ProcessedFormData> {
    const prompt = this.createPrompt(propertyType, propertyLabel, requiredFields, description)
    const result = await sendMessage(prompt)

    if (!result.success || !result.response) {
      throw new Error(
        result.error || "Gemini n'a pas pu generer le formulaire. Reessayez avec une description plus precise."
      )
    }

    const parsedData = this.parseAIResponse(result.response)
    const processedData = this.postProcessData(parsedData)

    return this.transformToFormData(processedData)
  }
}

export default AIFormService
