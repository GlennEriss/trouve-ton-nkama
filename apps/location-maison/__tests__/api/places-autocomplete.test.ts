const cache = { get: jest.fn(), set: jest.fn() }
const googleAutocomplete = jest.fn()

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
jest.mock('@/lib/places/google-places.server', () => ({ googleAutocomplete }))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

import { POST } from '@/app/api/places/autocomplete/route'

const request = (payload: unknown) => ({ json: async () => payload }) as Request

describe('/api/places/autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
    cache.set.mockResolvedValue(undefined)
    googleAutocomplete.mockResolvedValue([])
  })

  it('refuse une recherche sans type de lieu explicite', async () => {
    const response = await POST(request({ input: 'Libreville' }))

    expect(response.status).toBe(400)
    expect(googleAutocomplete).not.toHaveBeenCalled()
  })

  it.each(['city', 'district'] as const)('isole le cache et transmet le type %s à Google', async (kind) => {
    googleAutocomplete.mockResolvedValue([{ placeId: `${kind}-1`, mainText: 'Lieu' }])

    const response = await POST(request({
      input: 'Atong',
      kind,
      bias: { lat: 0.4, lng: 9.47 },
      sessionToken: 'session-1',
    }))

    expect(response.status).toBe(200)
    expect(cache.get).toHaveBeenCalledWith(`places:ac:${kind}:atong:0.40,9.47`)
    expect(googleAutocomplete).toHaveBeenCalledWith({
      input: 'Atong',
      kind,
      bias: { lat: 0.4, lng: 9.47 },
      sessionToken: 'session-1',
    })
  })
})
