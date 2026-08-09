import { renderHook } from '@testing-library/react'

let pathname = '/property/add/home'

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

import { DirectorFactory } from '@/directors/factory.director'
import { useFormPropertyType } from '@/hooks/useFormPropertyType'
import { usePropertyFormSchema } from '@/hooks/usePropertyFormSchema'
import {
  BuildingStep2Schema,
  DuplexSchema,
  DuplexStep2Schema,
  WarehouseSchema,
  WarehouseStep2Schema,
} from '@/models/schema'
import type { TypeProperty } from '@/models/annonce'

const propertyRoutes: Array<[string, TypeProperty]> = [
  ['apartment', 'Apartment'],
  ['building', 'Building'],
  ['desk', 'Desk'],
  ['duplex', 'Duplex'],
  ['home', 'Home'],
  ['kiosk', 'Kiosk'],
  ['land', 'Land'],
  ['room', 'Room'],
  ['shop', 'Shop'],
  ['studio', 'Studio'],
  ['villa', 'Villa'],
  ['warehouse', 'Warehouse'],
]

const validBase = {
  images: [{ fileURL: 'https://cdn.test/property.jpg', filePATH: 'property/property.jpg' }],
  title: 'Bien immobilier à Akébé',
  description: 'Un bien immobilier propre, accessible et proche des commerces.',
  price: 40000,
  area: 40,
  status: 'FOR_RENT' as const,
  isOwner: true,
  tags: ['calme'],
  address: {
    district: 'Akébé Poteau',
    city: 'Libreville',
    province: 'Estuaire',
  },
  cityPlaceId: 'google-city-libreville',
  districtPlaceId: 'google-district-akebe',
  locationSource: 'GOOGLE_PLACES' as const,
  contact: '+24166545430',
  longitude: 9.45,
  latitude: 0.39,
  country: 'Gabon',
  countryCode: 'GA',
  isLocExact: false,
}

describe('contrats des types d annonces', () => {
  it.each(propertyRoutes)('associe /property/add/%s au type %s', (route, expectedType) => {
    pathname = `/property/add/${route}`

    const { result } = renderHook(() => useFormPropertyType())

    expect(result.current.typeProperty).toBe(expectedType)
  })

  it('priorise le type du document pendant une modification', () => {
    pathname = '/property/modify/property-1'

    const { result } = renderHook(() =>
      useFormPropertyType({ typeProperty: 'Studio' }),
    )

    expect(result.current.typeProperty).toBe('Studio')
  })

  it.each(propertyRoutes)('construit un modèle %s avec le directeur %s', (_route, type) => {
    const property = DirectorFactory.createDirectorProperty(type).build()

    expect(property).toMatchObject({
      typeProperty: type,
      country: 'Gabon',
      state: 'IN_PROGRESS',
      moderationStatus: 'PENDING',
    })
  })

  it('initialise le numéro du studio à 01', () => {
    const studio = DirectorFactory.createDirectorProperty('Studio').build()

    expect(studio).toMatchObject({ numeroStudio: '01' })
  })
})

describe('validation des annonces spécifiques', () => {
  it('refuse une ville non sélectionnée, mais autorise un quartier et une localisation libres', () => {
    const result = DuplexSchema.safeParse({
      ...validBase,
      cityPlaceId: '',
      districtPlaceId: '',
      locationSource: 'UNVERIFIED',
      nbrRooms: 3,
      nbrKitchens: 1,
      nbrBathrooms: 2,
      nbrToilets: 2,
      nbrFloors: 2,
      nbrLivingRoom: 1,
      nbrGarages: 1,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      // Depuis 4d8f5a41, districtPlaceId et locationSource acceptent une
      // sélection non vérifiée (texte libre) ; seule la ville reste obligatoire.
      expect(result.error.flatten().fieldErrors).toEqual({
        cityPlaceId: ['Sélectionnez une ville proposée'],
      })
    }
  })

  it('conserve les identifiants Google avec les noms canoniques sélectionnés', () => {
    const parsed = DuplexSchema.parse({
      ...validBase,
      address: {
        district: 'Atong-Abè',
        city: 'Libreville',
        province: 'Estuaire',
      },
      nbrRooms: 3,
      nbrKitchens: 1,
      nbrBathrooms: 2,
      nbrToilets: 2,
      nbrFloors: 2,
      nbrLivingRoom: 1,
      nbrGarages: 1,
    })

    expect(parsed).toMatchObject({
      street: 'Atong-Abè',
      cityPlaceId: 'google-city-libreville',
      districtPlaceId: 'google-district-akebe',
      locationSource: 'GOOGLE_PLACES',
    })
  })

  it('accepte aussi un quartier canonique du catalogue administré', () => {
    const parsed = DuplexSchema.parse({
      ...validBase,
      address: {
        district: 'Atong-Abè',
        city: 'Libreville',
        province: 'Estuaire',
      },
      cityPlaceId: 'catalog:city:node:123',
      districtPlaceId: 'catalog:district:node:1827771028',
      locationSource: 'OFFICIAL_CATALOG',
      nbrRooms: 3,
      nbrKitchens: 1,
      nbrBathrooms: 2,
      nbrToilets: 2,
      nbrFloors: 2,
      nbrLivingRoom: 1,
      nbrGarages: 1,
    })

    expect(parsed).toMatchObject({
      street: 'Atong-Abè',
      districtPlaceId: 'catalog:district:node:1827771028',
      locationSource: 'OFFICIAL_CATALOG',
    })
  })

  it('conserve tous les champs métier du duplex', () => {
    const parsed = DuplexSchema.parse({
      ...validBase,
      nbrRooms: 3,
      nbrKitchens: 1,
      nbrBathrooms: 2,
      nbrToilets: 2,
      nbrFloors: 2,
      nbrLivingRoom: 1,
      nbrGarages: 1,
    })

    expect(parsed).toMatchObject({
      street: 'Akébé Poteau',
      city: 'Libreville',
      province: 'Estuaire',
      nbrFloors: 2,
      nbrLivingRoom: 1,
      nbrGarages: 1,
    })
  })

  it('conserve tous les champs métier de l entrepôt', () => {
    const parsed = WarehouseSchema.parse({
      ...validBase,
      nbrSections: 4,
      nbrToilets: 2,
    })

    expect(parsed).toMatchObject({
      street: 'Akébé Poteau',
      city: 'Libreville',
      province: 'Estuaire',
      nbrSections: 4,
      nbrToilets: 2,
    })
  })

  it('valide les vrais noms et types de champs de l immeuble', () => {
    expect(BuildingStep2Schema.safeParse({
      nbrApartments: 6,
      nbrFloors: 3,
      hasParking: true,
    }).success).toBe(true)

    expect(BuildingStep2Schema.safeParse({
      nbrAppartement: 6,
      nbrFloors: 3,
      hasParking: 1,
    }).success).toBe(false)
  })

  it('sélectionne les schémas complets et d étape des nouveaux types', () => {
    const duplex = renderHook(() => usePropertyFormSchema(1, 'Duplex'))
    const warehouse = renderHook(() => usePropertyFormSchema(1, 'Warehouse'))

    expect(duplex.result.current.currentStepSchema).toBe(DuplexStep2Schema)
    expect(duplex.result.current.fullSchema).toBe(DuplexSchema)
    expect(warehouse.result.current.currentStepSchema).toBe(WarehouseStep2Schema)
    expect(warehouse.result.current.fullSchema).toBe(WarehouseSchema)
  })
})
