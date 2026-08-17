import { renderHook } from '@testing-library/react'

const mockCreateFile = jest.fn()
const mockCreateProvince = jest.fn()
const mockCreateCity = jest.fn()
const mockCreateStreet = jest.fn()
const currentUser = { user: { uid: 'announcer-1' } }

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => currentUser,
}))

jest.mock('@/db/file.db', () => ({
  createFile: (...args: unknown[]) => mockCreateFile(...args),
}))

jest.mock('@/db/province.db', () => ({
  createProvince: (...args: unknown[]) => mockCreateProvince(...args),
}))

jest.mock('@/db/city.db', () => ({
  createCity: (...args: unknown[]) => mockCreateCity(...args),
}))

jest.mock('@/db/street.db', () => ({
  createStreet: (...args: unknown[]) => mockCreateStreet(...args),
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
    mockCreateProvince.mockResolvedValue('province-1')
    mockCreateCity.mockResolvedValue('city-1')
    mockCreateStreet.mockResolvedValue('street-1')
    mockCreateFile
      .mockResolvedValueOnce({ fileURL: 'https://cdn.test/new-1.jpg', filePATH: 'property/new-1.jpg' })
      .mockResolvedValueOnce({ fileURL: 'https://cdn.test/new-2.jpg', filePATH: 'property/new-2.jpg' })
  })

  it('conserve les images existantes selectionnees et uploade les nouveaux fichiers', async () => {
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

    expect(mockCreateFile).toHaveBeenCalledTimes(2)
    expect(mockCreateFile).toHaveBeenNthCalledWith(1, file, 'announcer-1', 'property')
    expect(mockCreateFile.mock.calls[1][0]).toBeInstanceOf(File)
    expect(mockCreateFile.mock.calls[1][0].name).toBe('image_1.jpeg')
    expect(property.images).toEqual([
      { fileURL: 'https://cdn.test/new-1.jpg', filePATH: 'property/new-1.jpg' },
      { fileURL: 'https://cdn.test/new-2.jpg', filePATH: 'property/new-2.jpg' },
      existing[0],
    ])
    expect(property.createdBy).toBe('announcer-1')
    expect(clearStorage).toHaveBeenCalledTimes(1)
  })

  it('retire les coordonnees techniques et les coordonnees nulles du document final', async () => {
    const { result } = renderHook(() => useOnSubmitFormProperty(baseProperty, [], false))

    const property = await result.current.onSubmit(validData())

    expect(property).not.toHaveProperty('provinceLon')
    expect(property).not.toHaveProperty('provinceLat')
    expect(property).not.toHaveProperty('cityLon')
    expect(property).not.toHaveProperty('cityLat')
    expect(property).not.toHaveProperty('streetLon')
    expect(property).not.toHaveProperty('streetLat')
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

  it('cree province, ville et rue avec les identifiants parents', async () => {
    const { result } = renderHook(() => useOnSubmitFormProperty(baseProperty, [], false))

    await result.current.onSubmit(validData())

    expect(mockCreateProvince).toHaveBeenCalledWith({
      name: 'Estuaire',
      country: 'Gabon',
      countryCode: 'GA',
      longitude: 9.45,
      latitude: 0.39,
    })
    expect(mockCreateCity).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Libreville',
      provinceId: 'province-1',
      provinceName: 'Estuaire',
      longitude: 9.46,
      latitude: 0.40,
    }))
    expect(mockCreateStreet).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Akébé Poteau',
      cityId: 'city-1',
      provinceId: 'province-1',
      longitude: 9.47,
      latitude: 0.41,
    }))
  })

  it('continue la preparation si la creation d une localisation echoue', async () => {
    mockCreateProvince.mockRejectedValue(new Error('offline'))
    mockCreateCity.mockRejectedValue(new Error('offline'))
    mockCreateStreet.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useOnSubmitFormProperty(baseProperty, [], false))

    const property = await result.current.onSubmit(validData())

    expect(property.title).toBe('Studio lumineux à Akébé')
    expect(mockCreateCity).toHaveBeenCalledWith(expect.objectContaining({ provinceId: null }))
    expect(mockCreateStreet).toHaveBeenCalledWith(expect.objectContaining({
      cityId: null,
      provinceId: null,
    }))
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
    expect(mockCreateFile).not.toHaveBeenCalled()
    expect(property.images).toEqual(preUploaded)
  })
})
