const mockCollection = jest.fn()

jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('firebase-admin/firestore', () => {
  class Timestamp {
    constructor(private seconds: number, private nanoseconds: number) {}
    toDate() { return new Date(this.seconds * 1000 + this.nanoseconds / 1_000_000) }
  }
  return { Timestamp, getFirestore: () => ({ collection: mockCollection }) }
})

import { Timestamp } from 'firebase-admin/firestore'
import {
  getProjectionCountryFallback,
  getProjectionCountryMeta,
  loadGabonOsmProjectionSerializableServer,
  shouldPreferGabonOsmProjectionServer,
} from '@/lib/location/gabon-osm-projection.server'

function doc(data: Record<string, unknown>) { return { data: () => data } }

function setup(data: { meta?: any; provinces?: any[]; cities?: any[]; quarters?: any[] }) {
  const snapshots: Record<string, any> = {
    geo_osm_meta: { doc: () => ({ get: async () => ({ exists: Boolean(data.meta), data: () => data.meta }) }) },
    geo_provinces: { get: async () => ({ empty: !(data.provinces?.length), docs: (data.provinces ?? []).map(doc) }) },
    geo_cities: { get: async () => ({ empty: !(data.cities?.length), docs: (data.cities ?? []).map(doc) }) },
    geo_quarters: { get: async () => ({ empty: !(data.quarters?.length), docs: (data.quarters ?? []).map(doc) }) },
  }
  mockCollection.mockImplementation((name: string) => snapshots[name])
}

describe('projection géographique OSM Firestore', () => {
  const originalEnv = process.env
  beforeEach(() => { jest.clearAllMocks(); process.env = { ...originalEnv } })
  afterAll(() => { process.env = originalEnv })

  it('applique les préférences explicites et les métadonnées pays par défaut', () => {
    process.env.OSM_SELECTOR_PREFER_PROJECTION = 'false'
    expect(shouldPreferGabonOsmProjectionServer()).toBe(false)
    process.env.OSM_SELECTOR_PREFER_PROJECTION = 'YES'
    expect(shouldPreferGabonOsmProjectionServer()).toBe(true)
    expect(getProjectionCountryFallback()).toEqual({ name: 'Gabon', iso2: 'GA' })
    expect(getProjectionCountryMeta({ countryName: ' République gabonaise ', countryIso2: 'ga' })).toEqual({ name: 'République gabonaise', iso2: 'GA' })
    expect(getProjectionCountryMeta(null)).toEqual({ name: 'Gabon', iso2: 'GA' })
  })

  it('retourne null quand la projection est vide ou entièrement invalide', async () => {
    setup({})
    await expect(loadGabonOsmProjectionSerializableServer()).resolves.toBeNull()
    setup({ provinces: [{ name: '', lat: 'bad', lon: null }], cities: [{ name: 4, lat: 0, lon: 1 }], quarters: [{ name: 'Q', lat: Infinity, lon: 1 }] })
    await expect(loadGabonOsmProjectionSerializableServer()).resolves.toBeNull()
  })

  it('normalise, trie et relie provinces, villes et quartiers', async () => {
    setup({
      meta: { countryName: 'Gabon Test', countryIso2: 'ga', sourceMode: 'local', sourcePath: '/data/osm.json', sourceBucket: 'bucket', sourceObjectPath: 'gabon/osm.json', sourceUpdatedAt: new Timestamp(1_767_312_000, 0) },
      provinces: [{ name: 'Woleu-Ntem', lat: '2.1', lon: 11.5 }, { name: 'Estuaire', lat: 0.4, lon: 9.4 }, { name: null, lat: 1, lon: 2 }],
      cities: [{ name: 'Oyem', province: 'Woleu-Ntem', lat: 1.6, lon: 11.5 }, { name: 'Libreville', province: 'Estuaire', lat: 0.39, lon: 9.45 }],
      quarters: [{ name: 'Atong-Abè', aliases: [' Toabet ', '', 4], city: 'Libreville', province: 'Estuaire', lat: 0.41, lon: 9.44 }, { name: 'Akébé', aliases: null, city: 'Libreville', province: '', lat: '0.3', lon: '9.5' }],
    })
    const result = await loadGabonOsmProjectionSerializableServer()
    expect(result?.data.provinces.map((item) => item.name)).toEqual(['Estuaire', 'Woleu-Ntem'])
    expect(result?.data.cities.map((item) => item.name)).toEqual(['Libreville', 'Oyem'])
    expect(result?.data.quarters.map((item) => item.name)).toEqual(['Akébé', 'Atong-Abè'])
    expect(result?.data).toMatchObject({ cityToProvince: { Libreville: 'Estuaire', Oyem: 'Woleu-Ntem' }, quarterToCity: { 'Atong-Abè': 'Libreville', 'Akébé': 'Libreville' }, quarterToProvince: { 'Atong-Abè': 'Estuaire' } })
    expect(result?.source).toEqual({ mode: 'local', sourcePath: '/data/osm.json', sourceBucket: 'bucket', sourceObjectPath: 'gabon/osm.json', sourceUpdatedAt: '2026-01-02T00:00:00.000Z' })
    expect(result?.data.quarters[1].aliases).toEqual(['Toabet'])
  })

  it('accepte Date et chaîne puis replie sur projectionUpdatedAt', async () => {
    setup({ meta: { projectionUpdatedAt: '2026-02-03', sourceUpdatedAt: 'invalid' }, provinces: [{ name: 'Estuaire', lat: 0, lon: 0 }] })
    const result = await loadGabonOsmProjectionSerializableServer()
    expect(result?.source).toMatchObject({ mode: 'cloud', sourcePath: 'firestore://geo_projection/gabon', sourceUpdatedAt: '2026-02-03T00:00:00.000Z' })
  })
})
