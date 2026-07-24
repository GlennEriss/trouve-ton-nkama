export {};
let GET: typeof import('@/app/api/reels/feed/route').GET

const getPublicReels = jest.fn()
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
jest.mock('@/db/reel.db', () => ({ getPublicReels }))
jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }))

const req = (query = '') => ({ url: `http://localhost/api/reels/feed?${query}` } as any)

describe('/api/reels/feed', () => {
  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/reels/feed/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
  })

  it('sert le cache sans requete DB', async () => {
    cache.get.mockResolvedValueOnce({ reels: [{ id: 'r1' }], nextCursor: null })
    const response = await GET(req('limitPerPage=10'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ reels: [{ id: 'r1' }] })
    expect(getPublicReels).not.toHaveBeenCalled()
  })

  it('lit les reels publics avec pagination et met en cache', async () => {
    getPublicReels.mockResolvedValueOnce({ reels: [{ id: 'r2' }], nextCursor: 'cur-2' })
    const response = await GET(req('limitPerPage=5&cursor=cur-1'))
    expect(await response.json()).toMatchObject({ reels: [{ id: 'r2' }], nextCursor: 'cur-2' })
    expect(getPublicReels).toHaveBeenCalledWith({ limitPerPage: 5, cursor: 'cur-1' })
    expect(cache.set).toHaveBeenCalledWith('reels:feed:5:cur-1', expect.any(Object), expect.any(Number))
  })

  it('utilise les valeurs par defaut sans parametres', async () => {
    getPublicReels.mockResolvedValueOnce({ reels: [], nextCursor: null })
    await GET(req())
    expect(getPublicReels).toHaveBeenCalledWith({ limitPerPage: 10, cursor: null })
  })

  it('traduit une panne en 500', async () => {
    getPublicReels.mockRejectedValueOnce(new Error('db down'))
    const response = await GET(req('limitPerPage=10'))
    expect(response.status).toBe(500)
  })
})
