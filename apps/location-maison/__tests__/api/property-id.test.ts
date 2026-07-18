import { getPropertyById } from '@/db/property.db'
import { getCacheStore } from '@/lib/cache'

let getProperty: typeof import('@/app/api/property/id/route').GET

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: async () => payload,
    }),
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

jest.mock('@/db/property.db', () => ({
  getPropertyById: jest.fn(),
}))

jest.mock('@/lib/cache', () => ({
  getCacheStore: jest.fn(),
}))

function makeRequest(url: string) {
  return { url } as Request
}

function makeCache(cached: unknown = null) {
  return {
    get: jest.fn(async () => cached),
    set: jest.fn(async () => undefined),
  }
}

const approvedProperty = {
  id: 'property-1',
  title: 'Belle chambre',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
}

describe('/api/property/id', () => {
  beforeAll(async () => {
    ;({ GET: getProperty } = await import('@/app/api/property/id/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('refuse une requete sans id', async () => {
    const cache = makeCache()
    ;(getCacheStore as jest.Mock).mockReturnValue(cache)

    const response = await getProperty(makeRequest('https://example.com/api/property/id'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
      },
    })
    expect(getPropertyById).not.toHaveBeenCalled()
    expect(cache.get).not.toHaveBeenCalled()
  })

  it('retourne une annonce depuis le cache sans relire Firestore', async () => {
    const cache = makeCache(approvedProperty)
    ;(getCacheStore as jest.Mock).mockReturnValue(cache)

    const response = await getProperty(makeRequest('https://example.com/api/property/id?id=property-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject(approvedProperty)
    expect(cache.get).toHaveBeenCalledWith('property:property-1')
    expect(getPropertyById).not.toHaveBeenCalled()
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('masque une annonce non approuvee comme introuvable', async () => {
    const cache = makeCache()
    ;(getCacheStore as jest.Mock).mockReturnValue(cache)
    ;(getPropertyById as jest.Mock).mockResolvedValue({
      ...approvedProperty,
      moderationStatus: 'PENDING',
    })

    const response = await getProperty(makeRequest('https://example.com/api/property/id?id=property-1'))
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'PROPERTY_NOT_FOUND',
      },
    })
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('met en cache et retourne une annonce publique valide', async () => {
    const cache = makeCache()
    ;(getCacheStore as jest.Mock).mockReturnValue(cache)
    ;(getPropertyById as jest.Mock).mockResolvedValue(approvedProperty)

    const response = await getProperty(makeRequest('https://example.com/api/property/id?id=property-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject(approvedProperty)
    expect(cache.set).toHaveBeenCalledWith('property:property-1', approvedProperty, 600)
  })
})
