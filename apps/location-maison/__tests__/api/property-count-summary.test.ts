let GET: typeof import('@/app/api/property/count/summary/route').GET
let DELETE: typeof import('@/app/api/property/count/summary/route').DELETE

const propertyDb = {
  getServerCountByPropertyType: jest.fn(async () => 1),
  getServerCountByProvince: jest.fn(async () => 2),
}
const cache = { get: jest.fn(), set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) }

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers ?? {}),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }))
jest.mock('@/db/property.db', () => propertyDb)
jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/constantes/home-page', () => ({
  HOME_PROPERTY_TYPE_KEYS: ['maison', 'appartement'],
  HOME_PROVINCE_NAMES: ['Estuaire', 'Ogooué-Maritime'],
}))

describe('/api/property/count/summary', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/property/count/summary/route')
    GET = mod.GET
    DELETE = mod.DELETE
  })
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
  })

  it('sert un resume valide en cache sans recompter', async () => {
    cache.get.mockResolvedValueOnce({ byType: { maison: 3 }, byProvince: { Estuaire: 4 }, generatedAt: '2026-07-22T00:00:00Z' })
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ byType: { maison: 3 } })
    expect(propertyDb.getServerCountByPropertyType).not.toHaveBeenCalled()
  })

  it('construit le resume par type et province puis le met en cache', async () => {
    propertyDb.getServerCountByPropertyType.mockResolvedValue(5)
    propertyDb.getServerCountByProvince.mockResolvedValue(9)
    const response = await GET()
    const payload = await response.json()
    expect(payload.byType).toEqual({ maison: 5, appartement: 5 })
    expect(payload.byProvince).toEqual({ Estuaire: 9, 'Ogooué-Maritime': 9 })
    expect(typeof payload.generatedAt).toBe('string')
    expect(cache.set).toHaveBeenCalled()
  })

  it('ignore un cache invalide et reconstruit', async () => {
    cache.get.mockResolvedValueOnce({ garbage: true })
    const response = await GET()
    expect(response.status).toBe(200)
    expect(cache.set).toHaveBeenCalled()
  })

  it('traduit une panne de comptage en 500', async () => {
    propertyDb.getServerCountByPropertyType.mockRejectedValueOnce(new Error('db down'))
    const response = await GET()
    expect(response.status).toBe(500)
  })

  it('DELETE invalide le cache du resume', async () => {
    const response = await DELETE()
    expect(response.status).toBe(200)
    expect(cache.del).toHaveBeenCalledWith('propertyCount:summary:v1')
  })
})
