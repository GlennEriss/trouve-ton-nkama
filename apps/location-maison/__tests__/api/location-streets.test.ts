let GET: typeof import('@/app/api/location/streets/route').GET

const firestore = {
  db: { name: 'db' },
  collection: jest.fn((_db, name) => ({ name })),
  query: jest.fn((...args) => ({ kind: 'query', args })),
  where: jest.fn((...args) => ({ kind: 'where', args })),
  getDocs: jest.fn(),
}
const cache = { get: jest.fn(), set: jest.fn(async () => undefined) }

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers ?? {}),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/firebase/firestore', () => firestore)
jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/constantes/firebase-collection-name', () => ({ __esModule: true, default: { streets: 'streets' } }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn(), warn: jest.fn() }) }))
jest.mock('@/lib/location/label-guards', () => ({ isDisplayableLocationLabel: (name: string) => name !== 'INVALID' }))

function snapshot(rows: Array<{ id: string; data: Record<string, unknown> }>) {
  return { forEach: (cb: (d: any) => void) => rows.forEach((r) => cb({ id: r.id, data: () => r.data })) }
}
const req = (query = 'cityId=city-1') => ({ url: `http://localhost/api/location/streets?${query}` } as any)

describe('/api/location/streets', () => {
  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/location/streets/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
  })

  it('exige un cityId', async () => {
    const response = await GET(req(''))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(firestore.getDocs).not.toHaveBeenCalled()
  })

  it('sert le cache sans requete Firestore', async () => {
    cache.get.mockResolvedValueOnce([{ id: 's1', name: 'Rue A' }])
    const response = await GET(req())
    expect(await response.json()).toMatchObject({ streets: [{ id: 's1', name: 'Rue A' }] })
    expect(firestore.getDocs).not.toHaveBeenCalled()
  })

  it('lit Firestore, filtre et trie les rues', async () => {
    firestore.getDocs.mockResolvedValueOnce(
      snapshot([
        { id: 's2', data: { name: 'Rue Zebre', cityId: 'city-1' } },
        { id: 's1', data: { name: 'Avenue Alpha', cityId: 'city-1' } },
        { id: 's3', data: { name: 'INVALID', cityId: 'city-1' } },
      ]),
    )
    const response = await GET(req())
    const payload = await response.json()
    expect(payload.streets.map((s: any) => s.name)).toEqual(['Avenue Alpha', 'Rue Zebre'])
    expect(firestore.where).toHaveBeenCalledWith('cityId', '==', 'city-1')
    expect(cache.set).toHaveBeenCalled()
  })

  it('traduit une panne Firestore en 500', async () => {
    firestore.getDocs.mockRejectedValueOnce(new Error('firestore down'))
    const response = await GET(req())
    expect(response.status).toBe(500)
  })
})
