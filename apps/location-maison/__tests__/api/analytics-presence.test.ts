let postPresence: typeof import('@/app/api/analytics/presence/route').POST

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
  source: 'catalog_search_page',
  actor: {},
  session: { session_id: 'session-1' },
}

function upstreamResponse(body: unknown, status = 200, contentType = 'application/json') {
  return {
    status,
    headers: new Headers({ 'content-type': contentType }),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : body == null ? '' : JSON.stringify(body)),
  }
}

describe('/api/analytics/presence', () => {
  const originalEnv = process.env

  beforeAll(async () => {
    ;({ POST: postPresence } = await import('@/app/api/analytics/presence/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      ANALYTICS_INGEST_URL: 'https://admin.test/ingest',
      ANALYTICS_INGEST_TOKEN: 'token-secret',
      NEXT_PUBLIC_APP_ENV: 'preprod',
    }
    global.fetch = jest.fn()
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('refuse les configurations incompletes', async () => {
    delete process.env.ANALYTICS_INGEST_URL
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true })
    const noUrl = await postPresence(request(validBody))
    expect(noUrl.status).toBe(500)
    expect(await noUrl.json()).toMatchObject({ error: { code: 'CONFIGURATION_ERROR' } })

    process.env.ANALYTICS_INGEST_URL = 'https://admin.test/ingest'
    delete process.env.ANALYTICS_INGEST_TOKEN
    const noToken = await postPresence(request(validBody))
    expect(noToken.status).toBe(500)
    expect(await noToken.json()).toMatchObject({ error: { code: 'CONFIGURATION_ERROR' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('retourne les chemins precis d un payload invalide', async () => {
    const response = await postPresence(request({ source: 'inconnue', actor: {}, session: {} }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR', details: { issues: expect.any(Array) } },
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('construit et transmet un batch canonique de presence', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstreamResponse({ success: true }, 202))
    const response = await postPresence(
      request(
        {
          source: 'search_with_ia_page',
          environment: 'prod',
          sent_at: '2026-07-22T10:00:00Z',
          occurred_at: '2026-07-22T09:00:00Z',
          actor: { actor_type: 'admin', actor_id: 'admin-1', is_authenticated: true },
          session: { session_id: 'session-9' },
          presence: { status: 'offline', device_type: 'mobile' },
        },
        { 'x-correlation-id': 'corr-existing', 'x-idempotency-key': 'idem-existing' },
      ),
    )
    expect(response.status).toBe(202)
    expect(response.headers.get('x-correlation-id')).toBe('corr-existing')

    const [url, init] = (fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://admin.test/ingest')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token-secret',
      'X-Correlation-Id': 'corr-existing',
      'Idempotency-Key': 'idem-existing',
      'X-Analytics-Source': 'location-maison',
    })
    const event = JSON.parse(init.body).events[0]
    expect(event).toMatchObject({
      event_name: 'user_presence_heartbeat',
      schema_version: '1.0.0',
      occurred_at: '2026-07-22T09:00:00Z',
      source: 'search_with_ia_page',
      environment: 'prod',
      correlation_id: 'corr-existing',
      actor: { actor_type: 'admin', actor_id: 'admin-1', is_authenticated: true },
      session: { session_id: 'session-9' },
      payload: {
        presence_subject: 'user',
        subject_id: 'admin-1',
        session_id: 'session-9',
        status: 'offline',
        last_seen_at: '2026-07-22T09:00:00Z',
        device_type: 'mobile',
        app_surface: 'web',
      },
    })
  })

  it('genere les identifiants, un sujet anonyme et les valeurs par defaut', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstreamResponse({ success: true }))
    const response = await postPresence(
      request({ source: 'location_maison_search_bar', actor: {}, session: { session_id: 's2' } }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('x-correlation-id')).toMatch(/^corr_presence_/)

    const [, init] = (fetch as jest.Mock).mock.calls[0]
    expect(init.headers['X-Analytics-Source']).toBe('location-maison')
    expect(init.headers['Idempotency-Key']).toMatch(/^idem_presence_/)
    const event = JSON.parse(init.body).events[0]
    expect(event).toMatchObject({
      environment: 'preprod',
      actor: { actor_type: 'user', is_authenticated: false },
      payload: { subject_id: 'anon:s2', status: 'online', device_type: 'unknown' },
    })
    expect(event.actor.actor_id).toBeUndefined()
  })

  it('transmet une erreur upstream texte et fabrique un body pour une reponse vide', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstreamResponse('maintenance', 503, 'text/plain'))
    expect(await (await postPresence(request(validBody))).json()).toMatchObject({
      error: { code: 'UPSTREAM_NON_JSON', message: 'maintenance' },
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstreamResponse(null, 204, 'text/plain'))
    expect(await (await postPresence(request(validBody))).json()).toMatchObject({
      error: { code: 'UPSTREAM_EMPTY_RESPONSE' },
    })
  })

  it.each([
    [Object.assign(new Error('timeout'), { name: 'AbortError' }), 504, 'UPSTREAM_TIMEOUT'],
    [new Error('network'), 502, 'UPSTREAM_FAILURE'],
  ])('traduit une panne upstream en %s', async (error, status, code) => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(error)
    const response = await postPresence(request(validBody))
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ error: { code } })
  })
})
