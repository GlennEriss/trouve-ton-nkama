export {};
let POST: typeof import('@/app/api/meta/capi/route').POST

jest.mock('next/server', () => {
  class MockResponse {
    status: number
    headers: Headers
    _body: unknown
    constructor(body: unknown, init?: { status?: number }) {
      this._body = body
      this.status = init?.status ?? 200
      this.headers = new Headers()
    }
    async json() {
      return this._body
    }
    static json(body: unknown, init?: { status?: number }) {
      return new MockResponse(body, init)
    }
  }
  return { NextResponse: MockResponse }
})
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn() }) }))
jest.mock('@/features/analytics/meta-pixel/domain/config', () => ({ META_PIXEL_ID: 'PIX-1', META_GRAPH_API_VERSION: 'v19.0' }))

function request(body: unknown, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return { headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null }, json: async () => body } as any
}
const validBody = { event_name: 'ViewContent', event_id: 'evt-1', event_source_url: 'https://tonnkama.com/p/1' }

describe('/api/meta/capi', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/meta/capi/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, META_CONVERSIONS_API_ACCESS_TOKEN: 'token-x' }
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => '' })) as any
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('no-op 204 sans token de configuration', async () => {
    delete process.env.META_CONVERSIONS_API_ACCESS_TOKEN
    const response = await POST(request(validBody))
    expect(response.status).toBe(204)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('no-op 204 sur un payload invalide', async () => {
    const response = await POST(request({ foo: 'bar' }))
    expect(response.status).toBe(204)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('relaie l evenement a la Conversions API avec le meme event_id', async () => {
    const response = await POST(
      request(validBody, { 'x-forwarded-for': '41.1.1.1, 10.0.0.1', 'user-agent': 'jest-ua' }),
    )
    expect(response.status).toBe(204)
    const [url, init] = (fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('/PIX-1/events')
    const payload = JSON.parse(init.body)
    expect(payload.access_token).toBe('token-x')
    expect(payload.data[0]).toMatchObject({ event_name: 'ViewContent', event_id: 'evt-1', action_source: 'website' })
    expect(payload.data[0].user_data).toMatchObject({ client_ip_address: '41.1.1.1', client_user_agent: 'jest-ua' })
  })

  it('reste un no-op 204 meme si Graph rejette ou echoue', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad' })
    expect((await POST(request(validBody))).status).toBe(204)
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect((await POST(request(validBody))).status).toBe(204)
  })
})
