import { searchLandingProperties } from '@/lib/seo/algolia-listings'

const mockLoggerError = jest.fn()
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: (...args: any[]) => mockLoggerError(...args) }) }))

describe('searchLandingProperties', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_ALGOLIA_APP_ID: 'APP', NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY: 'KEY' }
    global.fetch = jest.fn()
  })

  afterAll(() => { process.env = originalEnv })

  it('retourne un résultat vide pour une taxonomie invalide', async () => {
    await expect(searchLandingProperties({ transaction: 'bad' as any, type: 'maison' })).resolves.toMatchObject({ items: [], currentPage: 1, hitsPerPage: 20 })
    await expect(searchLandingProperties({ transaction: 'location', type: 'bad' as any })).resolves.toMatchObject({ totalHits: 0 })
    await expect(searchLandingProperties({ transaction: 'location', type: 'maison', citySlug: 'inconnue' })).resolves.toMatchObject({ totalPages: 0 })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuse une configuration Algolia absente', async () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_ALGOLIA_APP_ID')
    await expect(searchLandingProperties({ transaction: 'vente', type: 'terrain' })).resolves.toMatchObject({ items: [], totalHits: 0 })
    expect(mockLoggerError).toHaveBeenCalled()
  })

  it('normalise filtres, pagination et toutes les formes de résultats', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hits: [
          { objectID: 'p1', title: 'Villa', description: 'Belle', price: '45000', area: '80', nbrRooms: '3', nbrBathrooms: 2, status: 'FOR_SALE', typeProperty: 'house', city: 'Libreville', images: ['one.jpg'] },
          { id: 'p2', title: ' ', description: '', price: 'x', area: undefined, status: 'bad', typeProperty: 'unknown', images: null },
          { path: 'properties/p3', typeProperty: 'apartment' },
          { title: 'sans id' },
        ],
        nbHits: 4.9, nbPages: 3.7, page: 1.8, hitsPerPage: 10.9,
      }),
    })
    const result = await searchLandingProperties({ transaction: 'location', type: 'maison', citySlug: 'libreville', page: 2.9, hitsPerPage: 10.8 })
    expect(result).toMatchObject({ currentPage: 2, totalPages: 3, totalHits: 4, hitsPerPage: 10 })
    expect(result.items).toHaveLength(3)
    expect(result.items[0]).toMatchObject({ id: 'p1', price: 45000, area: 80, typeProperty: 'Home', detailsHref: '/annonce/p1' })
    expect(result.items[1]).toMatchObject({ title: 'Annonce immobiliere', price: 0, status: 'FOR_RENT', typeProperty: 'Home', images: [] })
    expect(result.items[2]).toMatchObject({ id: 'p3', typeProperty: 'Apartment' })
    const call = (fetch as jest.Mock).mock.calls[0]
    expect(call[0]).toContain('location-maison_property-index')
    expect(JSON.parse(call[1].body)).toMatchObject({ page: 1, hitsPerPage: 10, filters: expect.stringContaining('city:"Libreville"') })
    expect(call[1].next.tags).toContain('landing-properties:location:maison:libreville')
  })

  it('borne les paramètres et tolère une réponse sans métriques', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ hits: null }) })
    await expect(searchLandingProperties({ transaction: 'vente', type: 'studio', page: Number.NaN, hitsPerPage: 0 })).resolves.toEqual({ items: [], currentPage: 1, totalPages: 0, totalHits: 0, hitsPerPage: 1 })
  })

  it('retourne un vide stable sur erreur HTTP ou réseau', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'down' })
    await expect(searchLandingProperties({ transaction: 'location', type: 'villa', page: 3 })).resolves.toMatchObject({ items: [], currentPage: 3 })
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchLandingProperties({ transaction: 'location', type: 'villa' })).resolves.toMatchObject({ items: [], currentPage: 1 })
    expect(mockLoggerError).toHaveBeenCalledTimes(2)
  })
})
