export {};
let getReverse: typeof import('@/app/api/geocode/route').GET
let optionsReverse: typeof import('@/app/api/geocode/route').OPTIONS
let getSearch: typeof import('@/app/api/geocode/search/route').GET

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
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))

const req = (base: string, query: string) => ({ url: `http://localhost/api/${base}?${query}` } as any)
const nominatim = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body })

describe('/api/geocode (reverse)', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/geocode/route')
    getReverse = mod.GET
    optionsReverse = mod.OPTIONS
  })
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('exige lat et lng', async () => {
    const response = await getReverse(req('geocode', 'lat=1'))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('interroge Nominatim et pose les entetes de cache et CORS', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(nominatim({ display_name: 'Libreville' }))
    const response = await getReverse(req('geocode', 'lat=0.39&lng=9.45'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ display_name: 'Libreville' })
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('sert le cache memoire au second appel sur les memes coordonnees', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(nominatim({ display_name: 'Owendo' }))
    await getReverse(req('geocode', 'lat=1.11&lng=2.22'))
    await getReverse(req('geocode', 'lat=1.11&lng=2.22'))
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('traduit une erreur Nominatim en 502', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(nominatim({}, false, 500))
    const response = await getReverse(req('geocode', 'lat=5.5&lng=6.6'))
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: { code: 'NOMINATIM_UPSTREAM_ERROR' } })
  })

  it('OPTIONS renvoie 204 avec CORS', async () => {
    const response = await optionsReverse()
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })
})

describe('/api/geocode/search', () => {
  beforeAll(async () => {
    getSearch = (await import('@/app/api/geocode/search/route')).GET
  })
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('exige un terme de recherche', async () => {
    const response = await getSearch(req('geocode/search', 'countrycodes=GA'))
    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('interroge Nominatim avec le pays par defaut GA', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(nominatim([{ display_name: 'Akanda' }]))
    const response = await getSearch(req('geocode/search', 'q=akanda'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject([{ display_name: 'Akanda' }])
    const [url] = (fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('countrycodes=GA')
    expect(url).toContain('q=akanda')
  })

  it('traduit une erreur Nominatim en 502', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(nominatim({}, false, 503))
    const response = await getSearch(req('geocode/search', 'q=zzz-unique'))
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: { code: 'NOMINATIM_SEARCH_UPSTREAM_ERROR' } })
  })
})
