export {};
let getCities: typeof import('@/app/api/location/cities/route').GET
let getProvinces: typeof import('@/app/api/location/provinces/route').GET

const firestore = {
  db: { name: 'db' },
  collection: jest.fn((_db, name) => ({ name })),
  query: jest.fn((...args) => ({ kind: 'query', args })),
  where: jest.fn((...args) => ({ kind: 'where', args })),
  getDocs: jest.fn(),
}
const cache = { get: jest.fn(), set: jest.fn(async () => undefined) }

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers ?? {}),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/firebase/firestore', () => firestore)
jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/constantes/firebase-collection-name', () => ({ __esModule: true, default: { cities: 'cities', provinces: 'provinces' } }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn(), warn: jest.fn() }) }))
jest.mock('@/lib/location/label-guards', () => ({ isDisplayableLocationLabel: (name: string) => name !== 'INVALID' }))

function snapshot(rows: Array<{ id: string; data: Record<string, unknown> }>) {
  return { forEach: (cb: (d: any) => void) => rows.forEach((r) => cb({ id: r.id, data: () => r.data })) }
}
function citiesRequest(query = 'provinceId=prov-1') {
  return { url: `http://localhost/api/location/cities?${query}` } as any
}

describe('/api/location cluster', () => {
  beforeAll(async () => {
    getCities = (await import('@/app/api/location/cities/route')).GET
    getProvinces = (await import('@/app/api/location/provinces/route')).GET
  })
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
  })

  describe('cities', () => {
    it('exige un provinceId', async () => {
      const response = await getCities(citiesRequest(''))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
      expect(firestore.getDocs).not.toHaveBeenCalled()
    })

    it('sert le cache sans requete Firestore', async () => {
      cache.get.mockResolvedValueOnce([{ id: 'c1', name: 'Libreville' }])
      const response = await getCities(citiesRequest())
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ cities: [{ id: 'c1', name: 'Libreville' }] })
      expect(firestore.getDocs).not.toHaveBeenCalled()
    })

    it('lit Firestore, filtre les libelles non affichables et trie', async () => {
      firestore.getDocs.mockResolvedValueOnce(
        snapshot([
          { id: 'c2', data: { name: 'Port-Gentil', provinceId: 'prov-1' } },
          { id: 'c1', data: { name: 'Akanda', provinceId: 'prov-1' } },
          { id: 'c3', data: { name: 'INVALID', provinceId: 'prov-1' } },
        ]),
      )
      const response = await getCities(citiesRequest())
      const payload = await response.json()
      expect(payload.cities.map((c: any) => c.name)).toEqual(['Akanda', 'Port-Gentil'])
      expect(firestore.where).toHaveBeenCalledWith('provinceId', '==', 'prov-1')
      expect(cache.set).toHaveBeenCalled()
    })

    it('traduit une panne Firestore en 500', async () => {
      firestore.getDocs.mockRejectedValueOnce(new Error('firestore down'))
      const response = await getCities(citiesRequest())
      expect(response.status).toBe(500)
    })
  })

  describe('provinces', () => {
    it('sert le cache sans requete Firestore', async () => {
      cache.get.mockResolvedValueOnce([{ id: 'p1', name: 'Estuaire' }])
      const response = await getProvinces()
      expect(await response.json()).toMatchObject({ provinces: [{ id: 'p1', name: 'Estuaire' }] })
      expect(firestore.getDocs).not.toHaveBeenCalled()
    })

    it('lit Firestore et trie par nom', async () => {
      firestore.getDocs.mockResolvedValueOnce(
        snapshot([
          { id: 'p2', data: { name: 'Woleu-Ntem' } },
          { id: 'p1', data: { name: 'Estuaire' } },
        ]),
      )
      const response = await getProvinces()
      const payload = await response.json()
      expect(payload.provinces.map((p: any) => p.name)).toEqual(['Estuaire', 'Woleu-Ntem'])
      expect(cache.set).toHaveBeenCalled()
    })

    it('traduit une panne Firestore en 500', async () => {
      firestore.getDocs.mockRejectedValueOnce(new Error('firestore down'))
      const response = await getProvinces()
      expect(response.status).toBe(500)
    })
  })
})
