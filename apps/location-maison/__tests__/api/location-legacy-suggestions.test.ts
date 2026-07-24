export {};
const getSuggestions = jest.fn()

jest.mock('@/db/suggestion.db', () => ({ getSuggestions: (...args: unknown[]) => getSuggestions(...args) }))
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

describe('/api/location (suggestions legacy avec cache memoire)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Le cache est un Map au niveau module: repartir a froid a chaque test.
    jest.resetModules()
  })

  it('interroge la base et met en cache en memoire', async () => {
    getSuggestions.mockResolvedValueOnce(['Libreville', 'Akanda'])
    const { GET } = await import('@/app/api/location/route')

    const response = await GET({} as any)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(['Libreville', 'Akanda'])
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=600')
    expect(getSuggestions).toHaveBeenCalledTimes(1)
  })

  it('sert le cache en memoire pour un second appel rapproche', async () => {
    getSuggestions.mockResolvedValueOnce(['Libreville'])
    const { GET } = await import('@/app/api/location/route')

    await GET({} as any)
    const second = await GET({} as any)

    expect(await second.json()).toEqual(['Libreville'])
    expect(getSuggestions).toHaveBeenCalledTimes(1)
  })

  it('traduit une panne de la base en 500', async () => {
    getSuggestions.mockRejectedValueOnce(new Error('db down'))
    const { GET } = await import('@/app/api/location/route')

    const response = await GET({} as any)

    expect(response.status).toBe(500)
  })
})
