import { auth } from '@/next-auth/auth'
import { getFirestore } from 'firebase-admin/firestore'

let getAds: typeof import('@/app/api/announcer/ads/route').GET

jest.mock('next/server', () => ({
  NextResponse: { json: (payload: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => payload }) },
}))
jest.mock('@/next-auth/auth', () => ({ auth: jest.fn() }))
jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('firebase-admin/firestore', () => ({ getFirestore: jest.fn() }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }))

function request(query = '') {
  return { nextUrl: new URL(`http://localhost/api/announcer/ads${query}`) } as any
}

function dbWith(items: Array<Record<string, any>>) {
  return {
    collection: () => ({
      where: () => ({
        get: async () => ({ docs: items.map((item) => ({ id: item.id, data: () => { const { id, ...data } = item; return data } })) }),
      }),
    }),
  }
}

const future = Date.now() + 86_400_000
const items = [
  { id: 'a', title: 'Élégante villa Akanda', description: 'Piscine', city: 'Akanda', province: 'Estuaire', street: 'Angondjé', typeProperty: 'Villa', status: 'FOR_SALE', state: 'IN_PROGRESS', price: 120000000, createdAt: new Date('2026-01-01'), updatedAt: { toMillis: () => 3000 }, currentPromotion: { isActive: true, endDate: { seconds: future / 1000 } } },
  { id: 'b', title: 'Studio centre', city: 'Libreville', typeProperty: 'Studio', status: 'FOR_RENT', state: 'ARCHIVED', price: '40000', createdAt: '2026-02-01', updatedAt: { seconds: 2, nanoseconds: 500000000 } },
  { id: 'c', title: 'Maison familiale', city: 'Owendo', typeProperty: 'Home', status: 'FOR_RENT', state: 'IN_PROGRESS', price: 150000, createdAt: 0, updatedAt: { toMillis: () => { throw new Error('bad timestamp') } }, currentPromotion: { isActive: false, endDate: future } },
]

describe('/api/announcer/ads', () => {
  beforeAll(async () => { ({ GET: getAds } = await import('@/app/api/announcer/ads/route')) })
  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'u1' } })
    ;(getFirestore as jest.Mock).mockReturnValue(dbWith(items))
  })

  it('refuse un visiteur anonyme', async () => {
    ;(auth as jest.Mock).mockResolvedValueOnce(null)
    const response = await getAds(request())
    expect(response.status).toBe(401)
  })

  it('retourne le résumé global et une pagination stable', async () => {
    const response = await getAds(request('?limit=2&cursor=0'))
    const body = await response.json()
    expect(body.summary.global).toEqual({ total: 3, active: 2, archived: 1, promoted: 1, forRent: 2, forSale: 1 })
    expect(body.pagination).toMatchObject({ total: 3, limit: 2, nextCursor: '2', hasMore: true })
    expect(body.items.map((item: any) => item.id)).toEqual(['b', 'a'])
  })

  it('combine recherche accentuée, type, état, statut, prix et promotion', async () => {
    const response = await getAds(request('?q=elegante&sortBy=price&sortOrder=asc&type=Villa&state=IN_PROGRESS&status=FOR_SALE&priceMin=100000&priceMax=130000000&promoted=true'))
    const body = await response.json()
    expect(body.items.map((item: any) => item.id)).toEqual(['a'])
    expect(body.appliedFilters).toMatchObject({ q: 'elegante', sortBy: 'price', sortOrder: 'asc', priceMin: 100000, priceMax: 130000000 })
  })

  it.each([
    ['?sortBy=title&sortOrder=asc', ['a', 'c', 'b']],
    ['?sortBy=updatedAt&sortOrder=desc', ['a', 'b', 'c']],
    ['?promoted=false', ['b', 'c']],
  ])('applique le tri ou filtre %s', async (query, expected) => {
    const body = await (await getAds(request(query))).json()
    expect(body.items.map((item: any) => item.id)).toEqual(expected)
  })

  it('normalise les paramètres invalides et plafonne la limite', async () => {
    const body = await (await getAds(request('?limit=500&cursor=-2&sortBy=bad&sortOrder=bad&priceMin=nope'))).json()
    expect(body.pagination).toMatchObject({ limit: 50, cursor: '0', nextCursor: null })
    expect(body.appliedFilters).toMatchObject({ sortBy: 'createdAt', sortOrder: 'desc', priceMin: null })
  })

  it('traduit les pannes Firestore', async () => {
    ;(getFirestore as jest.Mock).mockReturnValueOnce({ collection: () => ({ where: () => ({ get: async () => { throw new Error('down') } }) }) })
    const response = await getAds(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: { code: 'INTERNAL_SERVER_ERROR' } })
  })
})
