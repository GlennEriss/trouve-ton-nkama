export {};
let postTraffic: typeof import('@/app/api/analytics/traffic/route').POST

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn() }) }))

function request(body: unknown, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]))
  return {
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
    json: async () => body,
  } as any
}

const validBody = {
  provider: 'vercel',
  session: { session_id: 'session-1' },
  visits: [{ metric_name: 'page_view', metric_value: 1, page_path: 'https://tonnkama.com/property?x=1' }],
}

function upstreamResponse(body: unknown, status = 200, contentType = 'application/json') {
  return {
    status,
    headers: new Headers({ 'content-type': contentType }),
    json: async () => body,
    text: async () => typeof body === 'string' ? body : body == null ? '' : JSON.stringify(body),
  }
}

describe('/api/analytics/traffic', () => {
  const originalEnv = process.env

  beforeAll(async () => { ({ POST: postTraffic } = await import('@/app/api/analytics/traffic/route')) })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, ANALYTICS_INGEST_URL: 'https://admin.test/ingest', ANALYTICS_INGEST_TOKEN: 'token-secret', NEXT_PUBLIC_APP_ENV: 'preprod' }
    global.fetch = jest.fn()
  })
  afterAll(() => { process.env = originalEnv })

  it('refuse les configurations incomplètes', async () => {
    delete process.env.ANALYTICS_INGEST_URL
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true })
    expect((await postTraffic(request(validBody))).status).toBe(500)
    process.env.ANALYTICS_INGEST_URL = 'https://admin.test/ingest'
    delete process.env.ANALYTICS_INGEST_TOKEN
    expect((await postTraffic(request(validBody))).status).toBe(500)
  })

  it('retourne les chemins précis d’un payload invalide', async () => {
    const response = await postTraffic(request({ session: {}, visits: [] }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR', details: { issues: expect.any(Array) } } })
  })

  it('construit et transmet un batch canonique Vercel', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstreamResponse({ success: true, accepted: 1 }, 202))
    const response = await postTraffic(request({
      ...validBody,
      sent_at: '2026-07-22T10:00:00Z',
      actor: { actor_type: 'admin', actor_id: 'admin-1', is_authenticated: true },
      visits: [{ provider_event_id: 'pv-1', metric_name: 'visit', metric_value: 2, occurred_at: '2026-07-22T09:00:00Z', page_path: 'https://tonnkama.com/property/one', route: '/property/[id]', country: 'GA', device_category: 'mobile' }],
    }, { 'x-correlation-id': 'corr-existing', 'x-idempotency-key': 'idem-existing' }))
    expect(response.status).toBe(202)
    expect(response.headers.get('x-correlation-id')).toBe('corr-existing')
    const [, init] = (fetch as jest.Mock).mock.calls[0]
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token-secret', 'Idempotency-Key': 'idem-existing', 'X-Analytics-Source': 'vercel' })
    const batch = JSON.parse(init.body)
    expect(batch.events[0]).toMatchObject({ source: 'vercel_analytics', environment: 'preprod', correlation_id: 'corr-existing', actor: { actor_type: 'admin', actor_id: 'admin-1', is_authenticated: true }, payload: { page_path: '/property/one', country: 'GA', device_category: 'mobile' } })
  })

  it('génère les identifiants, utilise le pays des headers et les valeurs par défaut Firebase', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstreamResponse({ success: true }))
    const response = await postTraffic(request({ provider: 'firebase', environment: 'prod', session: { session_id: 's2' }, visits: [{ metric_name: 'unique_visitor', metric_value: 1, page_path: 'sans-url' }] }, { 'cf-ipcountry': 'ga', 'x-correlation-id': ' '.repeat(2) }))
    expect(response.status).toBe(200)
    const [, init] = (fetch as jest.Mock).mock.calls[0]
    expect(init.headers['X-Analytics-Source']).toBe('firebase')
    expect(init.headers['Idempotency-Key']).toMatch(/^idem_traffic_/)
    const event = JSON.parse(init.body).events[0]
    expect(event).toMatchObject({ source: 'firebase_analytics', environment: 'prod', actor: { actor_type: 'user', is_authenticated: false }, payload: { page_path: '/', country: 'GA', device_category: 'unknown' } })
  })

  it('transmet une erreur upstream texte et fabrique un body pour une réponse vide', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstreamResponse('maintenance', 503, 'text/plain'))
    expect(await (await postTraffic(request(validBody))).json()).toMatchObject({ error: { code: 'UPSTREAM_NON_JSON', message: 'maintenance' } })
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstreamResponse(null, 204, 'text/plain'))
    expect(await (await postTraffic(request(validBody))).json()).toMatchObject({ error: { code: 'UPSTREAM_EMPTY_RESPONSE' } })
  })

  it.each([
    [Object.assign(new Error('timeout'), { name: 'AbortError' }), 504, 'UPSTREAM_TIMEOUT'],
    [new Error('network'), 502, 'UPSTREAM_FAILURE'],
  ])('traduit une panne upstream en %s', async (error, status, code) => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(error)
    const response = await postTraffic(request(validBody))
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ error: { code } })
  })
})
