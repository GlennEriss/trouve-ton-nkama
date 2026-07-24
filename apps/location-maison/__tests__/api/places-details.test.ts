export {};
let GET: typeof import('@/app/api/places/details/route').GET

const cache = { get: jest.fn(), set: jest.fn(async () => undefined) }
const googlePlaceDetails = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ debug: jest.fn(), error: jest.fn() }) }))
jest.mock('@/lib/places/google-places.server', () => ({ googlePlaceDetails }))

const req = (query: string) => ({ url: `http://localhost/api/places/details?${query}` } as any)

describe('/api/places/details', () => {
  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/places/details/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
  })

  it('exige un placeId', async () => {
    const response = await GET(req(''))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(googlePlaceDetails).not.toHaveBeenCalled()
  })

  it('sert le cache avec l entete X-Cache HIT', async () => {
    cache.get.mockResolvedValueOnce({ formattedAddress: 'Libreville, Gabon' })
    const response = await GET(req('placeId=place-1'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ place: { formattedAddress: 'Libreville, Gabon' } })
    expect(response.headers.get('X-Cache')).toBe('HIT')
    expect(googlePlaceDetails).not.toHaveBeenCalled()
  })

  it('interroge Google Places, met en cache et marque MISS', async () => {
    googlePlaceDetails.mockResolvedValueOnce({ formattedAddress: 'Akanda, Gabon' })
    const response = await GET(req('placeId=place-2&sessionToken=tok-1'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ place: { formattedAddress: 'Akanda, Gabon' } })
    expect(response.headers.get('X-Cache')).toBe('MISS')
    expect(googlePlaceDetails).toHaveBeenCalledWith('place-2', 'tok-1')
    expect(cache.set).toHaveBeenCalledWith('places:details:v2:place-2', { formattedAddress: 'Akanda, Gabon' }, expect.any(Number))
  })

  it('ne met pas en cache quand le lieu est introuvable', async () => {
    googlePlaceDetails.mockResolvedValueOnce(null)
    const response = await GET(req('placeId=missing'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ place: null })
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('traduit une panne Google Places en 500', async () => {
    googlePlaceDetails.mockRejectedValueOnce(new Error('places api down'))
    const response = await GET(req('placeId=place-1'))
    expect(response.status).toBe(500)
  })
})
