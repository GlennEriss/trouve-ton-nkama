import { getProperties } from '@/db/property.db'

let getPropertyList: typeof import('@/app/api/property/list/route').GET
const cache = { get: jest.fn(), set: jest.fn() }

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/db/property.db', () => ({ getProperties: jest.fn() }))
jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

describe('/api/property/list', () => {
  const request = (url: string) => ({ url }) as Request

  beforeAll(async () => {
    ;({ GET: getPropertyList } = await import('@/app/api/property/list/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
    cache.set.mockResolvedValue(undefined)
    ;(getProperties as jest.Mock).mockResolvedValue({ properties: [], lastDoc: null })
  })

  it.each([
    ['?limitPerPage=0', 1],
    ['?limitPerPage=5000', 50],
    ['?limitPerPage=invalid', 10],
    ['?limit=12', 12],
  ])('normalise la limite %s', async (query, expectedLimit) => {
    const response = await getPropertyList(request(`http://localhost/api/property/list${query}`))

    expect(response.status).toBe(200)
    expect(getProperties).toHaveBeenCalledWith({ limitPerPage: expectedLimit, lastDoc: null })
  })

  it('conserve un curseur simple et refuse un chemin Firestore', async () => {
    await getPropertyList(request('http://localhost/api/property/list?lastDoc=property-2'))
    expect(getProperties).toHaveBeenLastCalledWith({ limitPerPage: 10, lastDoc: 'property-2' })

    await getPropertyList(request('http://localhost/api/property/list?lastDoc=properties/property-2'))
    expect(getProperties).toHaveBeenLastCalledWith({ limitPerPage: 10, lastDoc: null })
  })

  it('sert le cache sans relire Firestore', async () => {
    cache.get.mockResolvedValue({ properties: [{ id: 'cached' }], lastDoc: null })

    const response = await getPropertyList(request('http://localhost/api/property/list?limit=8'))

    expect(await response.json()).toEqual({ properties: [{ id: 'cached' }], lastDoc: null })
    expect(getProperties).not.toHaveBeenCalled()
  })
})
