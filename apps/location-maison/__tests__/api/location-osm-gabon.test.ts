export {};
let GET: typeof import('@/app/api/location/osm/gabon/route').GET

const osmData = {
  loadOSMLocationsFromRaw: jest.fn(),
  serializeOSMLocationsData: jest.fn((parsed: unknown) => ({ serialized: parsed })),
}
const projection = {
  loadGabonOsmProjectionSerializableServer: jest.fn(),
  shouldPreferGabonOsmProjectionServer: jest.fn(),
}
const source = { getGabonOsmRootServer: jest.fn() }

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers ?? {}),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn(), warn: jest.fn() }) }))
jest.mock('@/data/gabon-osm-locations', () => osmData)
jest.mock('@/lib/location/gabon-osm-projection.server', () => projection)
jest.mock('@/lib/location/gabon-osm-source.server', () => source)

describe('/api/location/osm/gabon', () => {
  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/location/osm/gabon/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    projection.shouldPreferGabonOsmProjectionServer.mockReturnValue(false)
  })

  it('sert la projection serveur quand elle est preferee et disponible', async () => {
    projection.shouldPreferGabonOsmProjectionServer.mockReturnValue(true)
    projection.loadGabonOsmProjectionSerializableServer.mockResolvedValueOnce({ data: { provinces: 1 }, source: 'projection' })
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, source: 'projection', data: { provinces: 1 } })
    expect(source.getGabonOsmRootServer).not.toHaveBeenCalled()
  })

  it('renvoie 503 quand la source OSM est indisponible', async () => {
    source.getGabonOsmRootServer.mockResolvedValueOnce(null)
    const response = await GET()
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: { code: 'OSM_UNAVAILABLE' } })
  })

  it('renvoie 500 quand le fichier OSM est invalide', async () => {
    source.getGabonOsmRootServer.mockResolvedValueOnce({ root: 'raw', source: 'cloud' })
    osmData.loadOSMLocationsFromRaw.mockReturnValueOnce(null)
    const response = await GET()
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: { code: 'OSM_PARSE_FAILED' } })
  })

  it('parse et serialise la source OSM valide', async () => {
    source.getGabonOsmRootServer.mockResolvedValueOnce({ root: 'raw', source: 'local-fallback' })
    osmData.loadOSMLocationsFromRaw.mockReturnValueOnce({ nodes: 3 })
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, source: 'local-fallback', data: { serialized: { nodes: 3 } } })
    expect(osmData.serializeOSMLocationsData).toHaveBeenCalledWith({ nodes: 3 })
  })

  it('traduit une exception en 500', async () => {
    source.getGabonOsmRootServer.mockRejectedValueOnce(new Error('boom'))
    const response = await GET()
    expect(response.status).toBe(500)
  })
})
