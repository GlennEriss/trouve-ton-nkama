let GET: typeof import('@/app/api/location/search/route').GET
let POST: typeof import('@/app/api/location/search/route').POST

const redis = {
  zadd: jest.fn(async () => 1),
  zremrangebyrank: jest.fn(async () => 0),
  zincrby: jest.fn(async () => 1),
}
const cache = { get: jest.fn(), set: jest.fn(async () => undefined) }

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
  NextRequest: class {
    url: string
    constructor(url: URL | string) {
      this.url = url.toString()
    }
  },
}))
jest.mock('@/redis/client', () => ({ __esModule: true, default: redis }))
jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn(), warn: jest.fn() }) }))

function getRequest(query: string) {
  return { url: `http://localhost/api/location/search?${query}` } as any
}
function postRequest(body: unknown) {
  return { url: 'http://localhost/api/location/search', json: async () => body } as any
}

function photonResponse(features: unknown[], ok = true, status = 200) {
  return { ok, status, json: async () => ({ features }) }
}

const gabonFeature = {
  geometry: { coordinates: [9.45, 0.39] },
  properties: { name: 'Libreville', city: 'Libreville', countrycode: 'GA', country: 'Gabon', osm_type: 'R' },
}
const frenchFeature = {
  geometry: { coordinates: [2.35, 48.85] },
  properties: { name: 'Paris', countrycode: 'fr', country: 'France' },
}
const namelessGabon = {
  geometry: { coordinates: [0, 0] },
  properties: { name: '   ', countrycode: 'ga' },
}

describe('/api/location/search', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/location/search/route')
    GET = mod.GET
    POST = mod.POST
  })
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
    global.fetch = jest.fn()
  })

  it('rejette une requete trop courte', async () => {
    const response = await GET(getRequest('q=a'))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejette une absence de limit (quirk connu: null != undefined dans le schema)', async () => {
    // Le seul appelant (use-location-search) envoie toujours limit=8, donc ce chemin
    // n'est pas atteint en production, mais on fige le comportement reel de la route.
    const response = await GET(getRequest('q=libreville'))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('sert le cache sans appeler Photon et incremente la popularite', async () => {
    cache.get.mockResolvedValue({ results: [gabonFeature], timestamp: 123, query: 'libreville' })
    const response = await GET(getRequest('q=libreville&limit=8'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ cached: true, timestamp: 123, query: 'libreville' })
    expect(fetch).not.toHaveBeenCalled()
    expect(redis.zincrby).toHaveBeenCalledWith('gabon:popular', 1, 'libreville')
  })

  it('interroge Photon, filtre sur le Gabon, met en cache et indexe', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      photonResponse([gabonFeature, frenchFeature, namelessGabon]),
    )
    const response = await GET(getRequest('q=Libreville&limit=5'))
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.cached).toBe(false)
    expect(payload.results).toHaveLength(1)
    expect(payload.results[0].properties).toMatchObject({ name: 'Libreville', countrycode: 'ga' })

    const [url] = (fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('Libreville%20Gabon')
    expect(url).toContain('limit=5')
    expect(cache.set).toHaveBeenCalledWith('photon:search:libreville', expect.any(Object), 604800)
    expect(redis.zadd).toHaveBeenCalled()
    expect(redis.zincrby).toHaveBeenCalledWith('gabon:popular', 1, 'libreville')
  })

  it('traduit une reponse Photon non-ok en erreur 502', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(photonResponse([], false, 500))
    const response = await GET(getRequest('q=libreville&limit=8'))
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: { code: 'PHOTON_API_ERROR' } })
  })

  it('traduit une panne reseau Photon en 503', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'))
    const response = await GET(getRequest('q=libreville&limit=8'))
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: { code: 'PHOTON_TEMPORARY_UNAVAILABLE' } })
  })

  it('POST valide delegue au GET', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(photonResponse([gabonFeature]))
    const response = await POST(postRequest({ q: 'libreville', limit: '3' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ cached: false })
  })

  it('POST invalide renvoie 400', async () => {
    const response = await POST(postRequest({ q: 'x' }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })
})
