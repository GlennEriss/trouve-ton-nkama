export {};
let POST: typeof import('@/app/api/ai-search/insights/click/route').POST

const adminAuth = { verifyIdToken: jest.fn(async () => ({ uid: 'u1' })) }

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/firebase/admin', () => ({ adminAuth }))

function request(body: unknown, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return { headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null }, json: async () => body } as any
}
const authed = { authorization: 'Bearer tok' }
const validBody = { objectId: 'prop-1', queryId: 'q-1', position: 3, entrypointSource: 'search_cta' }

describe('/api/ai-search/insights/click', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/ai-search/insights/click/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_ALGOLIA_APP_ID: 'app-1', ALGOLIA_INSIGHTS_API_KEY: 'key-1' }
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => '' })) as any
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('exige un token Bearer', async () => {
    const response = await POST(request(validBody))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } })
  })

  it('rejette un corps invalide', async () => {
    const response = await POST(request({ objectId: '', queryId: 'q', position: 0 }, authed))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('pousse l evenement de clic a Algolia Insights', async () => {
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, tracked: true, source: 'search_cta' })
    const [url, init] = (fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('insights.algolia.io')
    expect(init.headers).toMatchObject({ 'X-Algolia-Application-Id': 'app-1', 'X-Algolia-API-Key': 'key-1' })
    const event = JSON.parse(init.body).events[0]
    expect(event).toMatchObject({ eventType: 'click', userToken: 'u1', queryID: 'q-1', objectIDs: ['prop-1'], positions: [3] })
  })

  it('remonte une configuration Algolia incomplete en 500', async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ALGOLIA_APP_ID
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: { code: 'ALGOLIA_CONFIGURATION_ERROR' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('traduit un echec de push Algolia en 502', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate' })
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: { code: 'ALGOLIA_INSIGHTS_PUSH_FAILED' } })
  })

  it('traduit un token expire en 401', async () => {
    adminAuth.verifyIdToken.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/id-token-expired' }))
    const response = await POST(request(validBody, authed))
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'AUTH_TOKEN_EXPIRED' } })
  })
})
