import { TypePropertyEnum } from '@/constantes/property-type'
import AIPromptsService from './ai-prompts.service'
import { OSMLocation, getOSMLocations } from '@/data/gabon-osm-locations'

export interface AIFormData {
  title: string
  description: string
  price: number | string
  area: number | string
  tags: string[]
  status?: string
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

interface ResolvedLocationData {
  district: string
  city: string
  province: string
  longitude: number
  latitude: number
  streetLon: number
  streetLat: number
  cityLon: number
  cityLat: number
  provinceLon: number
  provinceLat: number
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

  private normalizeLocationTerm(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private normalizeLocationCorpus(...parts: Array<string | undefined>): string {
    const merged = parts.filter(Boolean).join(' ')
    const normalized = this.normalizeLocationTerm(merged)
    return normalized ? ` ${normalized} ` : ''
  }

  private findLocationByName(name: string, locations: OSMLocation[]): OSMLocation | null {
    const normalizedName = this.normalizeLocationTerm(name)
    if (!normalizedName) return null
    return (
      locations.find((location) => this.normalizeLocationTerm(location.name) === normalizedName) ?? null
    )
  }

  private findBestLocationMatch(
    normalizedCorpus: string,
    locations: OSMLocation[]
  ): OSMLocation | null {
    if (!normalizedCorpus) return null

    let bestMatch: OSMLocation | null = null
    let bestScore = -1

    for (const location of locations) {
      const normalizedName = this.normalizeLocationTerm(location.name)
      if (!normalizedName || normalizedName.length < 3) continue
      if (!normalizedCorpus.includes(` ${normalizedName} `)) continue

      const tokenScore = normalizedName.split(' ').length * 100
      const charScore = normalizedName.length
      const score = tokenScore + charScore

      if (score > bestScore) {
        bestScore = score
        bestMatch = location
      }
    }

    return bestMatch
  }

  private resolveLocationFromDescription(...parts: Array<string | undefined>): ResolvedLocationData {
    const emptyLocation: ResolvedLocationData = {
      district: '',
      city: '',
      province: '',
      longitude: 0,
      latitude: 0,
      streetLon: 0,
      streetLat: 0,
      cityLon: 0,
      cityLat: 0,
      provinceLon: 0,
      provinceLat: 0,
    }

    const normalizedCorpus = this.normalizeLocationCorpus(...parts)
    if (!normalizedCorpus) return emptyLocation

    let osm: ReturnType<typeof getOSMLocations>
    try {
      osm = getOSMLocations()
    } catch {
      return emptyLocation
    }

    const quarterMatch = this.findBestLocationMatch(normalizedCorpus, osm.quarters)
    const cityMatch = this.findBestLocationMatch(normalizedCorpus, osm.cities)
    const provinceMatch = this.findBestLocationMatch(normalizedCorpus, osm.provinces)

    let resolvedQuarter: OSMLocation | null = quarterMatch
    let resolvedCity: OSMLocation | null = null
    let resolvedProvince: OSMLocation | null = null

    if (resolvedQuarter) {
      const cityNameFromQuarter = osm.quarterToCity.get(resolvedQuarter.name)
      const provinceNameFromQuarter = osm.quarterToProvince.get(resolvedQuarter.name)

      if (cityNameFromQuarter) {
        resolvedCity = this.findLocationByName(cityNameFromQuarter, osm.cities)
      }
      if (provinceNameFromQuarter) {
        resolvedProvince = this.findLocationByName(provinceNameFromQuarter, osm.provinces)
      }
    }

    if (!resolvedCity && cityMatch) {
      resolvedCity = cityMatch
    }

    if (!resolvedProvince && resolvedCity) {
      const provinceNameFromCity = osm.cityToProvince.get(resolvedCity.name)
      if (provinceNameFromCity) {
        resolvedProvince = this.findLocationByName(provinceNameFromCity, osm.provinces)
      }
    }

    if (!resolvedProvince && provinceMatch) {
      resolvedProvince = provinceMatch
    }

    const fallbackPoint = resolvedQuarter || resolvedCity || resolvedProvince
    if (!fallbackPoint && !resolvedQuarter && !resolvedCity && !resolvedProvince) {
      return emptyLocation
    }

    return {
      district: resolvedQuarter?.name ?? '',
      city: resolvedCity?.name ?? '',
      province: resolvedProvince?.name ?? '',
      longitude: fallbackPoint?.lon ?? 0,
      latitude: fallbackPoint?.lat ?? 0,
      streetLon: resolvedQuarter?.lon ?? 0,
      streetLat: resolvedQuarter?.lat ?? 0,
      cityLon: resolvedCity?.lon ?? 0,
      cityLat: resolvedCity?.lat ?? 0,
      provinceLon: resolvedProvince?.lon ?? 0,
      provinceLat: resolvedProvince?.lat ?? 0,
    }
  }

  private normalizeTextForMatch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  }

  private parseStatusCandidate(status: unknown): 'FOR_RENT' | 'FOR_SALE' | null {
    if (typeof status !== 'string') return null
    const normalized = this.normalizeTextForMatch(status)

    if (
      normalized === 'for_rent' ||
      normalized === 'for-rent' ||
      normalized === 'for rent' ||
      normalized === 'rent' ||
      normalized === 'a louer' ||
      normalized === 'a loue' ||
      normalized === 'location'
    ) {
      return 'FOR_RENT'
    }

    if (
      normalized === 'for_sale' ||
      normalized === 'for-sale' ||
      normalized === 'for sale' ||
      normalized === 'sale' ||
      normalized === 'a vendre' ||
      normalized === 'vente'
    ) {
      return 'FOR_SALE'
    }

    return null
  }

  private inferStatusFromText(...texts: Array<string | undefined>): 'FOR_RENT' | 'FOR_SALE' | null {
    const normalized = this.normalizeTextForMatch(texts.filter(Boolean).join(' '))
    if (!normalized) return null

    const rentKeywords = [
      'loyer',
      'a louer',
      'location',
      'locatif',
      'bail',
      'mensuel',
      'mensualite',
      'par mois',
      '/mois',
      'cfa/mois',
      'a loue',
      'charges comprises',
      'cc',
      'caution',
      'avance',
    ]
    const saleKeywords = [
      'a vendre',
      'vente',
      'vendre',
      'achat',
      'a ceder',
      'cession',
      'a cede',
      'prix de vente',
      'titre foncier',
      'parcelle',
    ]

    const rentScore = rentKeywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0)
    const saleScore = saleKeywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0)

    if (rentScore === 0 && saleScore === 0) return null
    if (rentScore === saleScore) return null
    return rentScore > saleScore ? 'FOR_RENT' : 'FOR_SALE'
  }

  private resolveStatus(
    explicitStatus: unknown,
    sourceDescription?: string,
    ...generatedTexts: Array<string | undefined>
  ): 'FOR_RENT' | 'FOR_SALE' {
    // La description utilisateur est la source la plus fiable.
    const inferredFromSource = this.inferStatusFromText(sourceDescription)
    if (inferredFromSource) return inferredFromSource

    const parsedStatus = this.parseStatusCandidate(explicitStatus)
    if (parsedStatus) return parsedStatus

    const inferredFromGenerated = this.inferStatusFromText(...generatedTexts)
    if (inferredFromGenerated) return inferredFromGenerated

    return 'FOR_SALE'
  }

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

  private extractPhone(description: string): string {
    const phoneMatch = description.match(/(?:\+241\s*)?(0[1-7][\d\s.-]{6,}|\d{8,})/)
    if (!phoneMatch?.[0]) return ''
    const digits = phoneMatch[0].replace(/[^\d+]/g, '')
    return digits.startsWith('+241') ? digits : digits
  }

  private inferIsOwner(description: string): boolean | undefined {
    const normalized = this.normalizeTextForMatch(description)
    if (/proprietaire\s+direct|je\s+suis\s+le\s+proprietaire|mon\s+bien/.test(normalized)) return true
    if (/mandataire|agence|demarcheur|intermediaire/.test(normalized)) return false
    return undefined
  }

  private buildDefaultPropertyDetails(propertyType: string, rooms: number): Record<string, unknown> {
    switch (propertyType) {
      case 'home':
        return {
          nbrRooms: rooms,
          nbrKitchens: 1,
          nbrBathrooms: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrToilets: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrGarages: 0,
          nbrFloors: 1,
          nbrLivingRoom: 1,
        }
      case 'apartment':
        return {
          nbrRooms: rooms,
          nbrKitchens: 1,
          nbrBathrooms: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrToilets: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrFloorApartment: 0,
          numeroApartment: '',
        }
      case 'villa':
        return {
          nbrRooms: rooms,
          nbrKitchens: 1,
          nbrBathrooms: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrToilets: Math.max(1, rooms > 0 ? Math.ceil(rooms / 2) : 1),
          nbrFloors: 1,
          nbrPiscine: 0,
          nbrGarages: 0,
        }
      case 'studio':
        return {
          nbrRooms: rooms > 0 ? rooms : 1,
          nbrKitchens: 1,
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
        status: generatedData.status ?? generatedData.propertyStatus ?? generatedData.listingStatus ?? '',
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
    propertyType: string,
    sourceDescription?: string
  ): ProcessedFormData {
    // S'assurer que price et area sont des nombres au moment de la transformation
    const normalizedPrice = typeof data.price === 'string'
      ? parseInt(data.price.replace(/[^0-9]/g, '') || '0', 10)
      : (Number.isFinite(data.price) ? data.price : 0)

    const normalizedArea = typeof data.area === 'string'
      ? parseFloat(String(data.area).replace(/[^0-9.]/g, '') || '0')
      : (Number.isFinite(data.area) ? data.area : 0)

    const resolvedLocation = this.resolveLocationFromDescription(
      sourceDescription,
      data.description,
      data.title
    )

    return {
      // Champs principaux du formulaire
      title: data.title,
      description: data.description,
      price: normalizedPrice,
      area: normalizedArea,
      tags: data.tags,
      status: this.resolveStatus(data.status, sourceDescription, data.title, data.description),
      
      // Structure address pour le formulaire
      address: {
        district: resolvedLocation.district,
        city: resolvedLocation.city,
        province: resolvedLocation.province
      },
      
      // Champs de localisation
      longitude: resolvedLocation.longitude,
      latitude: resolvedLocation.latitude,
      provinceLon: resolvedLocation.provinceLon,
      provinceLat: resolvedLocation.provinceLat,
      cityLon: resolvedLocation.cityLon,
      cityLat: resolvedLocation.cityLat,
      streetLon: resolvedLocation.streetLon,
      streetLat: resolvedLocation.streetLat,
      countryCode: 'GA',
      country: 'Gabon',
      
      // Informations additionnelles
      additionnalInformation: '',
      contact: this.extractPhone(sourceDescription ?? ''),
      isOwner: this.inferIsOwner(sourceDescription ?? ''),
      
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
    
    // 2. Appeler l'IA, avec fallback local si le fournisseur est indisponible.
    const result = await sendMessage(prompt)

    let parsedData: AIFormData
    if (!result.success || !result.response) {
      parsedData = this.buildFallbackAIData(propertyType, propertyLabel, description)
    } else {
      try {
        parsedData = this.parseAIResponse(result.response)
      } catch {
        parsedData = this.buildFallbackAIData(propertyType, propertyLabel, description)
      }
    }
    
    // 4. Post-traiter
    const processedData = this.postProcessData(parsedData)
    
    // 5. Transformer en format formulaire
    return this.transformToFormData(processedData, propertyType, description)
  }
}

export default AIFormService
