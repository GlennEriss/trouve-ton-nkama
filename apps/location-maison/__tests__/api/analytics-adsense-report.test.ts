export {};
let postAdsense: typeof import('@/app/api/analytics/ads/adsense-report/route').POST

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
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return { headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null }, json: async () => body } as any
}
function upstream(body: unknown, status = 200, contentType = 'application/json') {
  return {
    status,
    headers: new Headers({ 'content-type': contentType }),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : body == null ? '' : JSON.stringify(body)),
  }
}

const validBody = {
  report_rows: [
    { report_date: '2026-07-20', estimated_earnings: 12.5, dimension_country: 'GA' },
  ],
}

describe('/api/analytics/ads/adsense-report', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    ;({ POST: postAdsense } = await import('@/app/api/analytics/ads/adsense-report/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, ANALYTICS_ADSENSE_ADAPTER_URL: 'https://admin.test/adsense', ANALYTICS_INGEST_TOKEN: 'tok' }
    global.fetch = jest.fn()
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('refuse une configuration incomplete', async () => {
    delete process.env.ANALYTICS_ADSENSE_ADAPTER_URL
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true })
    expect((await postAdsense(request(validBody))).status).toBe(500)
    process.env.ANALYTICS_ADSENSE_ADAPTER_URL = 'https://admin.test/adsense'
    delete process.env.ANALYTICS_INGEST_TOKEN
    expect((await postAdsense(request(validBody))).status).toBe(500)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuse un payload sans ligne de rapport valide', async () => {
    const response = await postAdsense(request({ report_rows: [] }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    const badRow = await postAdsense(request({ report_rows: [{ report_date: '20260720', estimated_earnings: -1 }] }))
    expect(badRow.status).toBe(400)
  })

  it('transmet les lignes de rapport avec les entetes de service', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstream({ success: true }, 202))
    const response = await postAdsense(request(validBody, { 'x-correlation-id': 'corr-1', 'x-idempotency-key': 'idem-1' }))
    expect(response.status).toBe(202)
    expect(response.headers.get('x-correlation-id')).toBe('corr-1')
    const [url, init] = (fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://admin.test/adsense')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok', 'Idempotency-Key': 'idem-1', 'X-Analytics-Source': 'location-maison' })
    expect(JSON.parse(init.body).report_rows[0]).toMatchObject({ report_date: '2026-07-20', estimated_earnings: 12.5 })
  })

  it('genere des identifiants quand les entetes manquent', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstream({ success: true }))
    const response = await postAdsense(request(validBody))
    expect(response.headers.get('x-correlation-id')).toMatch(/^corr_adsense_/)
    const [, init] = (fetch as jest.Mock).mock.calls[0]
    expect(init.headers['Idempotency-Key']).toMatch(/^idem_adsense_/)
  })

  it('gere une reponse texte et un body vide upstream', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstream('down', 503, 'text/plain'))
    expect(await (await postAdsense(request(validBody))).json()).toMatchObject({ error: { code: 'UPSTREAM_NON_JSON' } })
    ;(fetch as jest.Mock).mockResolvedValueOnce(upstream(null, 204, 'text/plain'))
    expect(await (await postAdsense(request(validBody))).json()).toMatchObject({ error: { code: 'UPSTREAM_EMPTY_RESPONSE' } })
  })

  it.each([
    [Object.assign(new Error('t'), { name: 'AbortError' }), 504, 'UPSTREAM_TIMEOUT'],
    [new Error('net'), 502, 'UPSTREAM_FAILURE'],
  ])('traduit une panne upstream en %s', async (error, status, code) => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(error)
    const response = await postAdsense(request(validBody))
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ error: { code } })
  })
})
