import { renderHook } from '@testing-library/react'

const mockUploadPropertyImages = jest.fn()
const currentUser = { user: { uid: 'announcer-1' } }

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => currentUser,
}))

// La conversion Blob -> File et la concurrence bornée sont testées au niveau de
// uploadPropertyImages (__tests__/db/file.db.test.ts) — voir
// docs/performance-creation-modification-annonces-reels.md, point 4. Ce hook se contente de
// lui déléguer l'upload et de fusionner le résultat avec les images déjà uploadées.
jest.mock('@/db/file.db', () => ({
  uploadPropertyImages: (...args: unknown[]) => mockUploadPropertyImages(...args),
}))

import { useOnSubmitFormProperty } from '@/hooks/useOnSubmitFormProperty'

const baseProperty = {
  typeProperty: 'Studio',
  images: [],
  title: '',
  description: '',
  area: 0,
  price: 0,
  tags: [],
  street: '',
  city: '',
  province: '',
  longitude: 0,
  latitude: 0,
  country: 'Gabon',
  countryCode: 'GA',
  isLocExact: false,
  state: 'IN_PROGRESS',
  status: 'FOR_RENT',
  moderationStatus: 'PENDING',
  nbrRooms: 0,
  nbrKitchens: 0,
  nbrBathrooms: 0,
  nbrToilets: 0,
  nbrFloorStudio: 0,
  numeroStudio: '01',
} as any

function validData(overrides: Record<string, unknown> = {}) {
  return {
    images: [],
    title: 'Studio lumineux à Akébé',
    description: 'Studio propre et lumineux proche des commerces.',
    price: 40000,
    area: 20,
    tags: ['calme'],
    status: 'FOR_RENT',
    isOwner: true,
    street: 'Akébé Poteau',
    city: 'Libreville',
    province: 'Estuaire',
    country: 'Gabon',
    countryCode: 'GA',
    longitude: 0,
    latitude: 0,
    provinceLon: 9.45,
    provinceLat: 0.39,
    cityLon: 9.46,
    cityLat: 0.40,
    streetLon: 9.47,
    streetLat: 0.41,
    ...overrides,
  }
}

describe('useOnSubmitFormProperty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    currentUser.user = { uid: 'announcer-1' }
    mockUploadPropertyImages.mockResolvedValue([
      { fileURL: 'https://cdn.test/new-1.jpg', filePATH: 'property/new-1.jpg' },
      { fileURL: 'https://cdn.test/new-2.jpg', filePATH: 'property/new-2.jpg' },
    ])
  })

  it('conserve les images existantes selectionnees et delegue les nouveaux fichiers a uploadPropertyImages', async () => {
    const existing = [
      { fileURL: 'https://cdn.test/keep.jpg', filePATH: 'property/keep.jpg' },
      { fileURL: 'https://cdn.test/remove.jpg', filePATH: 'property/remove.jpg' },
    ]
    const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
    const blob = new Blob(['photo-2'], { type: 'image/png' })
    const clearStorage = jest.fn()
    const { result } = renderHook(() => useOnSubmitFormProperty(
      baseProperty,
      existing,
      false,
      clearStorage,
    ))

    const property = await result.current.onSubmit(validData({
      images: [existing[0].fileURL, file, blob],
    }))

    expect(mockUploadPropertyImages).toHaveBeenCalledTimes(1)
    expect(mockUploadPropertyImages).toHaveBeenCalledWith([file, blob], 'announcer-1', 'property')
    expect(property.images).toEqual([
      { fileURL: 'https://cdn.test/new-1.jpg', filePATH: 'property/new-1.jpg' },
      { fileURL: 'https://cdn.test/new-2.jpg', filePATH: 'property/new-2.jpg' },
      existing[0],
    ])
    expect(property.createdBy).toBe('announcer-1')
    expect(clearStorage).toHaveBeenCalledTimes(1)
  })

  // Depuis docs/performance-creation-modification-annonces-reels.md (point 1) : les
  // coordonnées techniques ne sont plus retirées du document — la synchronisation
  // géographique (Cloud Function onPropertyLocationSync) tourne désormais côté serveur,
  // hors du chemin critique, et a besoin de ces points de référence pour reproduire les
  // documents province/ville/rue. Seules longitude/latitude (position exacte du bien),
  // nulles par défaut, sont toujours retirées quand elles valent 0.
  it('conserve les coordonnees techniques de hierarchie, retire seulement une position nulle', async () => {
    const { result } = renderHook(() => useOnSubmitFormProperty(baseProperty, [], false))

    const property = await result.current.onSubmit(validData())

    expect(property).toMatchObject({
      provinceLon: 9.45,
      provinceLat: 0.39,
      cityLon: 9.46,
      cityLat: 0.40,
      streetLon: 9.47,
      streetLat: 0.41,
    })
    expect(property).not.toHaveProperty('longitude')
    expect(property).not.toHaveProperty('latitude')
    expect(property.isLocExact).toBe(false)
  })

  it('conserve une position exacte et le choix isLocExact', async () => {
    const { result } = renderHook(() => useOnSubmitFormProperty(baseProperty, [], true))

    const property = await result.current.onSubmit(validData({
      longitude: 9.47,
      latitude: 0.41,
      isLocExact: true,
    }))

    expect(property.longitude).toBe(9.47)
    expect(property.latitude).toBe(0.41)
    expect(property.isLocExact).toBe(true)
  })

  it('ne vide pas le brouillon pendant une modification', async () => {
    const clearStorage = jest.fn()
    const { result } = renderHook(() => useOnSubmitFormProperty(baseProperty, [], true, clearStorage))

    await result.current.onSubmit(validData())

    expect(clearStorage).not.toHaveBeenCalled()
  })

  it('reutilise les images pre-uploadees sans declencher de nouvel upload', async () => {
    const preUploaded = [
      { fileURL: 'https://cdn.test/pre-1.jpg', filePATH: 'property/pre-1.jpg' },
    ]
    const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
    const { result } = renderHook(() => useOnSubmitFormProperty(baseProperty, [], false))

    const property = await result.current.onSubmit(validData({ images: [file] }), preUploaded)

    // Le parcours IA facture un crédit avant d'appeler ce hook : ré-uploader ici ferait payer
    // deux fois la même image et rouvrirait la fenêtre de panne que ce paramètre supprime.
    expect(mockUploadPropertyImages).not.toHaveBeenCalled()
    expect(property.images).toEqual(preUploaded)
  })
})
