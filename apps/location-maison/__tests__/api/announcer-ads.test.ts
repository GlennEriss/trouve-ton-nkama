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

// Annonces marketplace : pas de typeProperty, mais un categoryId — comme en prod, où un
// backfill a posé categoryId sur presque toutes les annonces, immobilier comprise.
const mixedItems = [
  ...items.map((item) => ({ ...item, categoryId: item.typeProperty?.toLowerCase() })),
  { id: 'm1', title: 'Robe wax', city: 'Libreville', categoryId: 'vetements', categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Vêtements' }, state: 'IN_PROGRESS', moderationStatus: 'PENDING', price: 15000, createdAt: new Date('2026-03-01') },
  { id: 'm2', title: 'Gloss Crush', city: 'Libreville', categoryId: 'parfums-beaute', categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Parfums & beauté' }, state: 'IN_PROGRESS', price: 7000, createdAt: new Date('2026-03-02') },
]

describe('/api/announcer/ads — séparation immobilier / marketplace', () => {
  beforeAll(async () => { ({ GET: getAds } = await import('@/app/api/announcer/ads/route')) })
  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'u1' } })
    ;(getFirestore as jest.Mock).mockReturnValue(dbWith(mixedItems))
  })

  it('sépare sur typeProperty et non sur categoryId', async () => {
    // Les annonces immobilier portent AUSSI un categoryId : s'en servir comme discriminant
    // ferait basculer les 931 annonces immobilier de prod dans l'onglet marketplace.
    const immo = await (await getAds(request('?scope=immobilier'))).json()
    expect(immo.items.map((item: any) => item.id).sort()).toEqual(['a', 'b', 'c'])

    const market = await (await getAds(request('?scope=marketplace'))).json()
    expect(market.items.map((item: any) => item.id).sort()).toEqual(['m1', 'm2'])
  })

  it('renvoie des compteurs d onglets stables quels que soient les filtres', async () => {
    const filtered = await (await getAds(request('?scope=immobilier&type=Villa'))).json()

    expect(filtered.items).toHaveLength(1)
    // Le filtre réduit la liste mais jamais les compteurs d'onglets, sinon le nombre affiché
    // sur l'onglet voisin changerait sans raison visible.
    expect(filtered.scopeCounts).toEqual({ immobilier: 3, marketplace: 2 })
  })

  it('applique le defaut immobilier quand le scope est absent ou invalide', async () => {
    for (const query of ['', '?scope=', '?scope=nimportequoi']) {
      const body = await (await getAds(request(query))).json()
      expect(body.appliedFilters.scope).toBe('immobilier')
      expect(body.items.map((item: any) => item.id).sort()).toEqual(['a', 'b', 'c'])
    }
  })

  it('filtre par catégorie et compte les stats propres au marketplace', async () => {
    const body = await (await getAds(request('?scope=marketplace&category=vetements'))).json()

    expect(body.items.map((item: any) => item.id)).toEqual(['m1'])
    // Stats calculées sur l'onglet entier, pas sur le filtre en cours.
    expect(body.summary.global.total).toBe(2)
    expect(body.summary.global.pendingModeration).toBe(1)
    expect(body.summary.global.categoriesUsed).toBe(2)
    expect(body.summary.global.forRent).toBe(0)
  })

  it('ne propose que les catégories réellement utilisées dans l onglet', async () => {
    const body = await (await getAds(request('?scope=marketplace'))).json()

    expect(body.categoryOptions).toEqual([
      { id: 'vetements', label: 'Vêtements', count: 1 },
      { id: 'parfums-beaute', label: 'Parfums & beauté', count: 1 },
    ])
  })
})

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
    expect(body.summary.global).toEqual({ total: 3, active: 2, archived: 1, promoted: 1, forRent: 2, forSale: 1, pendingModeration: 0, categoriesUsed: 0 })
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

  it('inclut les annonces revendiquees (claimedBy) en plus de celles creees (createdBy), sans doublon', async () => {
    const created = { id: 'a', title: 'Creee par admin', typeProperty: 'Villa', status: 'FOR_SALE', state: 'IN_PROGRESS', price: 1, createdBy: 'admin-uid' }
    const claimedOnly = { id: 'd', title: 'Revendiquee par telephone', typeProperty: 'Studio', status: 'FOR_RENT', state: 'IN_PROGRESS', price: 2, createdBy: 'admin-uid', claimedBy: 'u1' }
    const both = { id: 'e', title: 'Creee et revendiquee par u1', typeProperty: 'Home', status: 'FOR_RENT', state: 'IN_PROGRESS', price: 3, createdBy: 'u1', claimedBy: 'u1' }

    const toDocs = (rows: Array<Record<string, any>>) => rows.map((item) => ({ id: item.id, data: () => { const { id, ...data } = item; return data } }))

    ;(getFirestore as jest.Mock).mockReturnValueOnce({
      collection: () => ({
        where: (field: string) => ({
          get: async () => ({
            docs: field === 'createdBy' ? toDocs([created, both]) : toDocs([claimedOnly, both]),
          }),
        }),
      }),
    })

    const response = await getAds(request())
    const body = await response.json()
    const ids = body.items.map((listing: { id: string }) => listing.id).sort()
    expect(ids).toEqual(['a', 'd', 'e'])
  })
})
