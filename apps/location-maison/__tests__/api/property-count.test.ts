export {};
let getByProvince: typeof import('@/app/api/property/count/by-province/route').GET
let getByType: typeof import('@/app/api/property/count/by-type/route').GET
let getByCategory: typeof import('@/app/api/property/count/by-category/route').GET

const propertyDb = {
  getServerCountByProvince: jest.fn(),
  getServerCountByPropertyType: jest.fn(),
  getServerCountByCategoryId: jest.fn(),
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
jest.mock('@/db/property.db', () => propertyDb)
jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn(), warn: jest.fn() }) }))

const req = (query: string, base: string) => ({ url: `http://localhost/api/property/count/${base}?${query}` } as any)

describe('/api/property/count', () => {
  beforeAll(async () => {
    getByProvince = (await import('@/app/api/property/count/by-province/route')).GET
    getByType = (await import('@/app/api/property/count/by-type/route')).GET
    getByCategory = (await import('@/app/api/property/count/by-category/route')).GET
  })
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
  })

  describe('by-province', () => {
    it('exige un parametre province', async () => {
      const response = await getByProvince(req('', 'by-province'))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
      expect(propertyDb.getServerCountByProvince).not.toHaveBeenCalled()
    })

    it('sert le compteur en cache sans requete', async () => {
      cache.get.mockResolvedValueOnce(7)
      const response = await getByProvince(req('province=Estuaire', 'by-province'))
      expect(await response.json()).toMatchObject({ count: 7 })
      expect(propertyDb.getServerCountByProvince).not.toHaveBeenCalled()
    })

    it('calcule et met en cache le compteur', async () => {
      propertyDb.getServerCountByProvince.mockResolvedValueOnce(42)
      const response = await getByProvince(req('province=Estuaire', 'by-province'))
      expect(await response.json()).toMatchObject({ count: 42 })
      expect(propertyDb.getServerCountByProvince).toHaveBeenCalledWith('Estuaire')
      expect(cache.set).toHaveBeenCalledWith('propertyCountByProvince:Estuaire', 42, expect.any(Number))
    })

    it('traduit une panne en 500', async () => {
      propertyDb.getServerCountByProvince.mockRejectedValueOnce(new Error('db down'))
      const response = await getByProvince(req('province=Estuaire', 'by-province'))
      expect(response.status).toBe(500)
    })
  })

  describe('by-type', () => {
    it('exige un parametre type', async () => {
      const response = await getByType(req('', 'by-type'))
      expect(response.status).toBe(400)
      expect(propertyDb.getServerCountByPropertyType).not.toHaveBeenCalled()
    })

    it('sert le compteur en cache sans requete', async () => {
      cache.get.mockResolvedValueOnce(3)
      const response = await getByType(req('type=maison', 'by-type'))
      expect(await response.json()).toMatchObject({ count: 3 })
      expect(propertyDb.getServerCountByPropertyType).not.toHaveBeenCalled()
    })

    it('calcule et met en cache le compteur', async () => {
      propertyDb.getServerCountByPropertyType.mockResolvedValueOnce(11)
      const response = await getByType(req('type=maison', 'by-type'))
      expect(await response.json()).toMatchObject({ count: 11 })
      expect(propertyDb.getServerCountByPropertyType).toHaveBeenCalledWith('maison')
      expect(cache.set).toHaveBeenCalledWith('propertyCountByType:maison', 11, expect.any(Number))
    })

    it('traduit une panne en 500', async () => {
      propertyDb.getServerCountByPropertyType.mockRejectedValueOnce(new Error('db down'))
      const response = await getByType(req('type=maison', 'by-type'))
      expect(response.status).toBe(500)
    })
  })

  describe('by-category', () => {
    it('exige un parametre categoryId', async () => {
      const response = await getByCategory(req('', 'by-category'))
      expect(response.status).toBe(400)
      expect(propertyDb.getServerCountByCategoryId).not.toHaveBeenCalled()
    })

    it('sert le compteur en cache sans requete', async () => {
      cache.get.mockResolvedValueOnce(8)
      const response = await getByCategory(req('categoryId=vetements', 'by-category'))
      expect(await response.json()).toMatchObject({ count: 8 })
      expect(propertyDb.getServerCountByCategoryId).not.toHaveBeenCalled()
    })

    it('calcule et met en cache le compteur', async () => {
      propertyDb.getServerCountByCategoryId.mockResolvedValueOnce(18)
      const response = await getByCategory(req('categoryId=vetements', 'by-category'))
      expect(await response.json()).toMatchObject({ count: 18 })
      expect(propertyDb.getServerCountByCategoryId).toHaveBeenCalledWith('vetements')
      expect(cache.set).toHaveBeenCalledWith('propertyCountByCategory:vetements', 18, expect.any(Number))
    })

    it('traduit une panne en 500', async () => {
      propertyDb.getServerCountByCategoryId.mockRejectedValueOnce(new Error('db down'))
      const response = await getByCategory(req('categoryId=vetements', 'by-category'))
      expect(response.status).toBe(500)
    })
  })
})
