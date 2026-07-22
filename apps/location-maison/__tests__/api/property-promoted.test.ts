let GET: typeof import('@/app/api/property/promoted/route').GET

let currentDb: any
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
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn(), warn: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('firebase-admin/firestore', () => ({ getFirestore: () => currentDb }))
jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))

function makeDb(rows: Array<{ id: string; data: Record<string, unknown> }>, shouldThrow = false) {
  const snap = { forEach: (cb: (d: any) => void) => rows.forEach((r) => cb({ id: r.id, data: () => r.data })) }
  const query: any = {
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    get: async () => {
      if (shouldThrow) throw new Error('firestore down')
      return snap
    },
  }
  return { collection: () => query }
}

const futureEnd = { seconds: Math.floor(Date.now() / 1000) + 100000 }

describe('/api/property/promoted', () => {
  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/property/promoted/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
  })

  it('sert le cache sans requete Firestore', async () => {
    cache.get.mockResolvedValueOnce({ featuredProperties: [{ id: 'p1' }], trendingProperties: [], boostProperties: [] })
    currentDb = makeDb([])
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ featuredProperties: [{ id: 'p1' }] })
  })

  it('classe les annonces promues par type et validite', async () => {
    currentDb = makeDb([
      { id: 'f1', data: { currentPromotion: { type: 'featured', isActive: true, endDate: futureEnd } } },
      { id: 'b1', data: { currentPromotion: { type: 'boost', isActive: false } } },
      { id: 't1', data: { currentPromotion: { type: 'trending-7d', isActive: true, endDate: futureEnd } } },
      { id: 'expired', data: { currentPromotion: { type: 'featured', isActive: true, endDate: { seconds: 1 } } } },
      { id: 'no-promo', data: {} },
    ])
    const response = await GET()
    const payload = await response.json()
    expect(payload.featuredProperties.map((p: any) => p.id)).toEqual(['f1'])
    expect(payload.boostProperties.map((p: any) => p.id)).toEqual(['b1'])
    expect(payload.trendingProperties.map((p: any) => p.id)).toEqual(['t1'])
    expect(cache.set).toHaveBeenCalled()
  })

  it('traduit une panne Firestore en 500', async () => {
    currentDb = makeDb([], true)
    const response = await GET()
    expect(response.status).toBe(500)
  })
})
