export {};
let GET: typeof import('@/app/api/overpass/route').GET
let OPTIONS: typeof import('@/app/api/overpass/route').OPTIONS

jest.mock('next/server', () => {
  class MockResponse {
    status: number
    headers: Headers
    _body: unknown
    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this._body = body
      this.status = init?.status ?? 200
      this.headers = new Headers(init?.headers ?? {})
    }
    async json() {
      return this._body
    }
    static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockResponse(body, init)
    }
  }
  return { NextResponse: MockResponse }
})
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn(), error: jest.fn() }) }))

const req = (query: string) => ({ url: `http://localhost/api/overpass?${query}` } as any)

describe('/api/overpass', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/overpass/route')
    GET = mod.GET
    OPTIONS = mod.OPTIONS
  })
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('exige le parametre data avec CORS', async () => {
    const response = await GET(req(''))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('relaie la reponse Overpass avec CORS', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ elements: [{ id: 1 }] }) })
    const response = await GET(req('data=[out:json];node(1);'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ elements: [{ id: 1 }] })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('traduit une erreur Overpass en 502', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 504, json: async () => ({}) })
    const response = await GET(req('data=xxx'))
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: { code: 'OVERPASS_UPSTREAM_ERROR' } })
  })

  it('OPTIONS renvoie 204 avec CORS', async () => {
    const response = await OPTIONS()
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })
})
