import { SimpleLocationUpdater, testIdGenerator, updateAllLocations } from '@/updaters/simple-location-updater'
import { getSuggestions } from '@/db/suggestion.db'
import { createProvinceIfNotExists } from '@/db/province.db'
import { createCityIfNotExists } from '@/db/city.db'
import { createStreetIfNotExists } from '@/db/street.db'
import { LocationIdGenerator } from '@/db/generic.db'

jest.mock('@/db/suggestion.db', () => ({ getSuggestions: jest.fn() }))
jest.mock('@/db/province.db', () => ({ createProvinceIfNotExists: jest.fn() }))
jest.mock('@/db/city.db', () => ({ createCityIfNotExists: jest.fn() }))
jest.mock('@/db/street.db', () => ({ createStreetIfNotExists: jest.fn() }))
jest.mock('@/db/generic.db', () => ({
  LocationIdGenerator: {
    generateProvince: jest.fn(() => 'province-id'),
    generateCity: jest.fn(() => 'city-id'),
    generateStreet: jest.fn(() => 'street-id'),
  },
}))

const suggestionsMock = jest.mocked(getSuggestions)
const provinceMock = jest.mocked(createProvinceIfNotExists)
const cityMock = jest.mocked(createCityIfNotExists)
const streetMock = jest.mocked(createStreetIfNotExists)

function photonResponse(features: unknown[], ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: jest.fn().mockResolvedValue({ features }) }) as any
}

const feature = (name: string, coordinates: [number, number], countrycode = 'ga') => ({
  geometry: { type: 'Point', coordinates },
  properties: { name, country: 'Gabon', countrycode },
})

describe('SimpleLocationUpdater', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    suggestionsMock.mockResolvedValue({ Estuaire: { Libreville: ['Akebe', 'Sibang'] } } as any)
    provinceMock.mockResolvedValue('province-estuaire')
    cityMock.mockResolvedValue('city-libreville')
    streetMock.mockResolvedValue('street-id')
    global.fetch = jest.fn()
      .mockImplementationOnce(() => photonResponse([feature('Estuaire', [9.4, 0.4])]))
      .mockImplementationOnce(() => photonResponse([feature('Libreville', [9.5, 0.5])]))
      .mockImplementationOnce(() => photonResponse([feature('Akebe', [9.6, 0.6])]))
      .mockImplementationOnce(() => photonResponse([feature('Sibang', [9.7, 0.7])])) as jest.Mock
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('importe les provinces, villes et rues avec les coordonnées Photon', async () => {
    const promise = SimpleLocationUpdater.updateAllLocations()
    await jest.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({
      success: true,
      processed: { provinces: 1, cities: 1, streets: 2 },
      errors: [],
    })
    expect(provinceMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Estuaire', latitude: 0.4, longitude: 9.4, searchableName: 'estuaire',
    }))
    expect(cityMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Libreville', provinceId: 'province-estuaire', latitude: 0.5,
    }))
    expect(streetMock).toHaveBeenCalledWith(expect.objectContaining({
      cityId: 'city-libreville', provinceId: 'province-estuaire', countryCode: 'ga',
    }))
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('Estuaire%20Gabon'), expect.objectContaining({
      headers: { 'User-Agent': 'Simple-Location-Updater/1.0' },
    }))
  })

  it('utilise des coordonnées nulles quand Photon ne trouve pas le lieu', async () => {
    global.fetch = jest.fn(() => photonResponse([
      { ...feature('Paris', [2.3, 48.8], 'fr'), properties: { country: 'France', countrycode: 'fr', name: 'Paris' } },
    ])) as jest.Mock
    suggestionsMock.mockResolvedValue({ Ogooue: {} } as any)

    const result = await updateAllLocations()
    expect(result.success).toBe(true)
    expect(provinceMock).toHaveBeenCalledWith(expect.objectContaining({ latitude: 0, longitude: 0 }))
  })

  it('continue avec des coordonnées nulles si Photon échoue', async () => {
    global.fetch = jest.fn(() => photonResponse([], false, 503)) as jest.Mock
    suggestionsMock.mockResolvedValue({ Nyanga: {} } as any)

    const result = await SimpleLocationUpdater.updateAllLocations()
    expect(result.processed.provinces).toBe(1)
    expect(provinceMock).toHaveBeenCalledWith(expect.objectContaining({ latitude: 0, longitude: 0 }))
  })

  it('retourne un échec fatal sans données de suggestions', async () => {
    suggestionsMock.mockResolvedValue(null as any)
    const result = await SimpleLocationUpdater.updateAllLocations()
    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain('Aucune donnée de suggestions trouvée')
    expect(provinceMock).not.toHaveBeenCalled()
  })

  it('n incrémente pas les compteurs quand les créations échouent', async () => {
    suggestionsMock.mockResolvedValue({ Estuaire: { Libreville: ['Akebe'] } } as any)
    provinceMock.mockRejectedValueOnce(new Error('province indisponible'))
    cityMock.mockRejectedValueOnce(new Error('ville indisponible'))
    streetMock.mockRejectedValueOnce(new Error('rue indisponible'))

    const promise = SimpleLocationUpdater.updateAllLocations()
    await jest.runAllTimersAsync()
    const result = await promise
    expect(result).toEqual({
      success: true,
      processed: { provinces: 0, cities: 0, streets: 0 },
      errors: [],
    })
    expect(cityMock).toHaveBeenCalledWith(expect.objectContaining({ provinceId: null }))
    expect(streetMock).toHaveBeenCalledWith(expect.objectContaining({ cityId: null, provinceId: null }))
  })

  it('exerce les trois variantes du générateur d identifiants', () => {
    SimpleLocationUpdater.testIdGenerator()
    testIdGenerator()
    expect(LocationIdGenerator.generateProvince).toHaveBeenCalledWith('Estuaire', 0.98226, 1.56855)
    expect(LocationIdGenerator.generateCity).toHaveBeenCalledWith('Libreville', 9.4673, 0.4162)
    expect(LocationIdGenerator.generateStreet).toHaveBeenCalledWith('Sibang', 9.4673, 0.4162)
  })
})
