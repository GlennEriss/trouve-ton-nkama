import {
  algoliaRequestCacheKey,
  algoliaRequestTtlSeconds,
  algoliaProxyCache,
  resolveAlgoliaSearchRequests,
  type AlgoliaProxyRequest,
} from '@/lib/algolia-search-proxy'

describe('algoliaRequestCacheKey', () => {
  it('produit la meme cle quel que soit l\'ordre des proprietes', () => {
    const a: AlgoliaProxyRequest = { indexName: 'idx', params: { query: '', filters: 'x', hitsPerPage: 0 } }
    const b: AlgoliaProxyRequest = { params: { hitsPerPage: 0, filters: 'x', query: '' }, indexName: 'idx' }

    expect(algoliaRequestCacheKey(a)).toBe(algoliaRequestCacheKey(b))
  })

  it('produit des cles differentes pour des requetes differentes', () => {
    const a: AlgoliaProxyRequest = { indexName: 'idx', params: { query: 'a' } }
    const b: AlgoliaProxyRequest = { indexName: 'idx', params: { query: 'b' } }

    expect(algoliaRequestCacheKey(a)).not.toBe(algoliaRequestCacheKey(b))
  })
})

describe('algoliaRequestTtlSeconds', () => {
  const originalHits = process.env.ALGOLIA_CACHE_HITS_TTL_SECONDS
  const originalFacets = process.env.ALGOLIA_CACHE_FACETS_TTL_SECONDS

  afterEach(() => {
    process.env.ALGOLIA_CACHE_HITS_TTL_SECONDS = originalHits
    process.env.ALGOLIA_CACHE_FACETS_TTL_SECONDS = originalFacets
  })

  it('utilise un TTL plus long par defaut pour une requete facettes uniquement (hitsPerPage: 0)', () => {
    const facetOnly: AlgoliaProxyRequest = { params: { hitsPerPage: 0 } }
    const withHits: AlgoliaProxyRequest = { params: { hitsPerPage: 20 } }

    expect(algoliaRequestTtlSeconds(facetOnly)).toBeGreaterThan(algoliaRequestTtlSeconds(withHits))
  })

  it('respecte les variables d\'environnement quand elles sont valides', () => {
    process.env.ALGOLIA_CACHE_HITS_TTL_SECONDS = '15'
    process.env.ALGOLIA_CACHE_FACETS_TTL_SECONDS = '300'

    expect(algoliaRequestTtlSeconds({ params: { hitsPerPage: 20 } })).toBe(15)
    expect(algoliaRequestTtlSeconds({ params: { hitsPerPage: 0 } })).toBe(300)
  })

  it('retombe sur les defauts si la variable d\'environnement est invalide', () => {
    process.env.ALGOLIA_CACHE_HITS_TTL_SECONDS = 'not-a-number'
    expect(algoliaRequestTtlSeconds({ params: { hitsPerPage: 20 } })).toBeGreaterThan(0)
  })
})

describe('resolveAlgoliaSearchRequests', () => {
  beforeEach(async () => {
    // Vide le cache partage entre chaque test (module singleton).
    await algoliaProxyCache.del(algoliaRequestCacheKey({ indexName: 'idx', params: { query: 'a' } }))
    await algoliaProxyCache.del(algoliaRequestCacheKey({ indexName: 'idx', params: { query: 'b' } }))
  })

  it('retourne un tableau vide sans appeler Algolia quand il n\'y a aucune requete', async () => {
    const fetchFromAlgolia = jest.fn()
    const result = await resolveAlgoliaSearchRequests([], fetchFromAlgolia)

    expect(result).toEqual({ results: [] })
    expect(fetchFromAlgolia).not.toHaveBeenCalled()
  })

  it('appelle Algolia une seule fois puis sert le resultat depuis le cache', async () => {
    const request: AlgoliaProxyRequest = { indexName: 'idx', params: { query: 'a' } }
    const fetchFromAlgolia = jest.fn().mockResolvedValue({ results: [{ hits: ['one'] }] })

    const first = await resolveAlgoliaSearchRequests([request], fetchFromAlgolia)
    expect(first.results).toEqual([{ hits: ['one'] }])
    expect(fetchFromAlgolia).toHaveBeenCalledTimes(1)

    const second = await resolveAlgoliaSearchRequests([request], fetchFromAlgolia)
    expect(second.results).toEqual([{ hits: ['one'] }])
    // Toujours 1 : la deuxieme requete identique a ete servie depuis le cache.
    expect(fetchFromAlgolia).toHaveBeenCalledTimes(1)
  })

  it('ne renvoie a Algolia que les requetes manquantes d\'un lot, en preservant l\'ordre', async () => {
    const cached: AlgoliaProxyRequest = { indexName: 'idx', params: { query: 'a' } }
    const missing: AlgoliaProxyRequest = { indexName: 'idx', params: { query: 'b' } }
    const fetchFromAlgolia = jest.fn().mockResolvedValue({ results: [{ hits: ['first'] }] })

    // Pre-remplit le cache pour `cached` uniquement.
    await resolveAlgoliaSearchRequests([cached], fetchFromAlgolia)
    fetchFromAlgolia.mockClear()
    fetchFromAlgolia.mockResolvedValue({ results: [{ hits: ['second'] }] })

    const result = await resolveAlgoliaSearchRequests([cached, missing], fetchFromAlgolia)

    expect(fetchFromAlgolia).toHaveBeenCalledTimes(1)
    expect(fetchFromAlgolia).toHaveBeenCalledWith([missing])
    expect(result.results).toEqual([{ hits: ['first'] }, { hits: ['second'] }])
  })
})
