import { AIFormService, type AIFormData } from '@/services/ai-form.service'
import AIPromptsService from '@/services/ai-prompts.service'

describe('AIPromptsService', () => {
  it('construit les prompts de conseil avec leur contexte métier', () => {
    expect(AIPromptsService.getSystemPrompt()).toContain('assistant immobilier français expert')
    expect(AIPromptsService.getFormAnalysisPrompt({ title: 'Villa' }, {
      activeStep: 1,
      totalSteps: 4,
      factoryType: 'villa',
    })).toContain('Détails de la propriété (2/4)')
    expect(AIPromptsService.getFormAnalysisPrompt({}, {})).toContain('Inconnu (?/4)')
    expect(AIPromptsService.getTagSuggestionPrompt({
      propertyType: 'Maison', area: 120, price: 400000, city: 'Akanda', province: 'Estuaire', description: 'Calme',
    })).toContain('4-6 tags pertinents')
    expect(AIPromptsService.getTagSuggestionPrompt({})).toContain('Non spécifié')
    expect(AIPromptsService.getDescriptionImprovementPrompt('Maison calme', {
      propertyType: 'Maison', area: 100, nbrRooms: 3, city: 'Libreville', province: 'Estuaire',
    })).toContain('Maison calme')
    expect(AIPromptsService.getPriceEstimationPrompt({ propertyType: 'Studio', area: 30 })).toContain('estimation indicative')
    expect(AIPromptsService.getLocationAdvicePrompt({
      street: 'Akébé Poteau', city: 'Libreville', province: 'Estuaire', additionalInformation: 'Près du marché',
    })).toContain('Près du marché')
  })

  it.each([
    ['home', 'nbrLivingRoom'],
    ['apartment', 'numeroApartment'],
    ['villa', 'nbrPiscine'],
    ['studio', 'numeroStudio'],
    ['building', 'hasParking'],
    ['desk', 'nbrToilets'],
    ['shop', 'nbrToilet'],
    ['kiosk', 'kioskType'],
    ['room', 'roomType'],
    ['land', 'additionalInfo'],
  ])('décrit le JSON attendu pour %s', (type, expectedField) => {
    const prompt = AIPromptsService.getAutoFillPrompt(type, type, ['title', 'price'], 'Annonce utilisateur')
    expect(prompt).toContain(expectedField)
    expect(prompt).toContain('Annonce utilisateur')
    expect(prompt).toContain('FOR_RENT')
    expect(prompt).toContain('FCFA')
  })

  it('compose un prompt contextualisé avec ou sans formulaire', () => {
    const complete = AIPromptsService.buildContextualPrompt('Améliore le titre', {
      activeStep: 0,
      totalSteps: 4,
      currentFormData: { title: 'Maison' },
    })
    expect(complete).toContain('ÉTAPE ACTUELLE: Informations générales (1/4)')
    expect(complete).toContain('"title": "Maison"')
    expect(complete).toContain('QUESTION UTILISATEUR: Améliore le titre')

    const minimal = AIPromptsService.buildContextualPrompt('Aide-moi', {})
    expect(minimal).not.toContain('ÉTAPE ACTUELLE:')
    expect(minimal).toContain("n'invente jamais de valeur")
  })
})

describe('AIFormService', () => {
  const service = new AIFormService()

  it('borne la description donnée à Gemini', () => {
    const prompt = service.createPrompt('home', 'Maison', ['title'], `début-${'x'.repeat(3000)}-fin`)
    expect(prompt).toContain('début-')
    expect(prompt).not.toContain('-fin')
  })

  it('extrait un JSON entouré de markdown et conserve uniquement les données structurées', () => {
    const parsed = service.parseAIResponse(`Réponse Gemini:\n\`\`\`json
      {
        "title": " Belle chambre ",
        "description": " Description pro ",
        "price": "40 000 FCFA",
        "area": "25",
        "tags": ["Meublé", 2, "Calme", "Parking", "Wi-Fi", "Famille"],
        "propertyStatus": "FOR_RENT",
        "address": {"district": " Akébé ", "city": " Libreville ", "province": " Estuaire "},
        "longitude": "9,45",
        "countryCode": "",
        "country": "",
        "contact": " 077857658 ",
        "isOwner": true,
        "propertyDetails": {"nbrRooms": 1}
      }
    \`\`\` fin`)

    expect(parsed).toMatchObject({
      title: 'Belle chambre',
      status: 'FOR_RENT',
      tags: ['Meublé', 'Calme', 'Parking', 'Wi-Fi', 'Famille'],
      address: { district: 'Akébé', city: 'Libreville', province: 'Estuaire' },
      countryCode: 'GA',
      country: 'Gabon',
      contact: '077857658',
      isOwner: true,
      propertyDetails: { nbrRooms: 1 },
    })
  })

  it('rejette une réponse Gemini illisible', () => {
    expect(() => service.parseAIResponse('aucun json')).toThrow('Gemini a renvoye une reponse illisible')
  })

  it('normalise nombres, tags, statut, adresse et coordonnées', () => {
    const input = {
      title: 'Studio',
      description: 'Studio moderne',
      price: '1.500.000 XAF',
      area: -20,
      tags: ['Meublé', '', 'Parking', 'Wi-Fi', 'Calme', 'Famille'],
      status: 'UNKNOWN',
      address: null,
      longitude: '9,456',
      latitude: Number.POSITIVE_INFINITY,
      provinceLon: 'texte',
      cityLon: '10.5',
      countryCode: ' ',
      country: ' ',
      additionnalInformation: 25,
      contact: ' 066000000 ',
      propertyDetails: {},
    } as unknown as AIFormData

    expect(service.postProcessData(input)).toMatchObject({
      price: 1500000,
      area: 0,
      tags: ['Meublé', 'Parking', 'Wi-Fi', 'Calme', 'Famille'],
      status: 'FOR_RENT',
      address: { district: '', city: '', province: '' },
      longitude: 9456,
      latitude: 0,
      provinceLon: 0,
      cityLon: 11,
      countryCode: 'GA',
      country: 'Gabon',
      additionnalInformation: '',
      contact: '066000000',
    })
  })

  it('aplatit les détails du bien pour le formulaire final', () => {
    const result = service.transformToFormData({
      title: 'Villa',
      description: 'Grande villa',
      price: '900 000 francs',
      area: '250',
      tags: ['Piscine'],
      status: 'FOR_SALE',
      address: { district: 'Okala' },
      longitude: 9.4,
      latitude: 0.5,
      countryCode: 'GA',
      country: 'Gabon',
      additionnalInformation: '',
      contact: '',
      propertyDetails: { nbrRooms: 5, nbrPiscine: 1 },
    })
    expect(result).toMatchObject({
      price: 900000,
      area: 250,
      status: 'FOR_SALE',
      address: { district: 'Okala', city: '', province: '' },
      contact: undefined,
      nbrRooms: 5,
      nbrPiscine: 1,
    })
  })

  it('exécute le pipeline complet et remonte les échecs Gemini', async () => {
    const sendMessage = jest.fn().mockResolvedValue({
      success: true,
      response: JSON.stringify({
        title: 'Maison familiale', description: 'Belle maison', price: 400000, area: 100,
        tags: ['Famille'], listingStatus: 'FOR_RENT', address: {}, propertyDetails: { nbrRooms: 3 },
      }),
    })
    await expect(service.processAIRequest('home', 'Maison', ['title'], 'Maison à louer', sendMessage)).resolves.toMatchObject({
      title: 'Maison familiale', price: 400000, nbrRooms: 3,
    })
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('Maison à louer'))

    await expect(service.processAIRequest('home', 'Maison', [], 'x', jest.fn().mockResolvedValue({
      success: false,
      error: 'Quota Gemini dépassé',
    }))).rejects.toThrow('Quota Gemini dépassé')
    await expect(service.processAIRequest('home', 'Maison', [], 'x', jest.fn().mockResolvedValue({
      success: true,
      response: '',
    }))).rejects.toThrow("Gemini n'a pas pu generer")
  })
})
