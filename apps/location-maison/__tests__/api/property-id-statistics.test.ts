export {};
let GET: typeof import('@/app/api/property/[id]/statistics/route').GET

const adminAuth = { verifyIdToken: jest.fn() }
const getPropertyStatistics = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers ?? {}),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminAuth }))
jest.mock('@/db/property-statistics.db', () => ({ getPropertyStatistics }))

function request(headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return { headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null } } as any
}
const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })
const authed = { authorization: 'Bearer tok' }

describe('/api/property/[id]/statistics', () => {
  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/property/[id]/statistics/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'owner-1' })
  })

  it('exige un identifiant de propriete', async () => {
    const response = await GET(request(authed), paramsFor(''))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('exige un token Bearer', async () => {
    const response = await GET(request(), paramsFor('property-1'))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } })
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
  })

  it('rejette un token invalide', async () => {
    adminAuth.verifyIdToken.mockRejectedValueOnce(new Error('bad token'))
    const response = await GET(request(authed), paramsFor('property-1'))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_TOKEN_INVALID' } })
  })

  it('renvoie les statistiques avec entete de cache prive', async () => {
    getPropertyStatistics.mockResolvedValueOnce({ totalViews: 42 })
    const response = await GET(request(authed), paramsFor('property-1'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ totalViews: 42 })
    expect(response.headers.get('Cache-Control')).toContain('private')
    expect(getPropertyStatistics).toHaveBeenCalledWith('property-1', 'owner-1')
  })

  it('renvoie 404 quand les statistiques sont introuvables', async () => {
    getPropertyStatistics.mockResolvedValueOnce(null)
    const response = await GET(request(authed), paramsFor('property-1'))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code: 'STATISTICS_NOT_FOUND' } })
  })

  it('traduit un acces non autorise en 403', async () => {
    getPropertyStatistics.mockRejectedValueOnce(new Error('Accès non autorisé'))
    const response = await GET(request(authed), paramsFor('property-1'))
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } })
  })
})
