export {};
let GET: typeof import('@/app/api/location/suggestions/route').GET

const redis = { zrange: jest.fn() }

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/redis/client', () => ({ __esModule: true, default: redis }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn(), error: jest.fn() }) }))

const req = (query: string) => ({ url: `http://localhost/api/location/suggestions?${query}` } as any)

describe('/api/location/suggestions', () => {
  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/location/suggestions/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejette une requete vide', async () => {
    const response = await GET(req('q='))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'Paramètres invalides' })
  })

  it('rejette une absence de limit (meme quirk null!=undefined que /location/search)', async () => {
    // Comportement reel fige: limit absent => null => schema z.string().optional() echoue.
    const response = await GET(req('q=libreville'))
    expect(response.status).toBe(400)
  })

  it('renvoie les suggestions autocomplete correspondant au prefixe, surlignees', async () => {
    // autocomplete: [member, score, member, score, ...]
    redis.zrange.mockResolvedValueOnce(['libreville', 50, 'lambarene', 30, 'oyem', 20])
    // popular (appele car matches < limit)
    redis.zrange.mockResolvedValueOnce([])
    const response = await GET(req('q=li&limit=10'))
    const payload = await response.json()
    expect(payload.query).toBe('li')
    expect(payload.suggestions.map((s: any) => s.text)).toEqual(['libreville'])
    expect(payload.suggestions[0]).toMatchObject({ type: 'autocomplete', highlighted: '<mark>li</mark>breville' })
  })

  it('complete avec les recherches populaires quand l autocomplete est insuffisant', async () => {
    redis.zrange.mockResolvedValueOnce(['libreville', 50]) // 1 match autocomplete
    redis.zrange.mockResolvedValueOnce(['quartier libreville', 99, 'autre', 5]) // popular contient "li"
    const response = await GET(req('q=li&limit=10'))
    const payload = await response.json()
    const byType = payload.suggestions.reduce((acc: any, s: any) => ({ ...acc, [s.type]: (acc[s.type] || 0) + 1 }), {})
    expect(byType.autocomplete).toBe(1)
    expect(byType.popular).toBe(1)
    // l autocomplete passe avant le populaire
    expect(payload.suggestions[0].type).toBe('autocomplete')
  })

  it('bascule sur le fallback local quand Redis echoue', async () => {
    redis.zrange.mockRejectedValueOnce(new Error('redis down'))
    const response = await GET(req('q=libre&limit=5'))
    const payload = await response.json()
    expect(payload.fallback).toBe(true)
    expect(payload.suggestions.map((s: any) => s.text)).toContain('libreville')
    expect(payload.suggestions[0].type).toBe('fallback')
  })
})
