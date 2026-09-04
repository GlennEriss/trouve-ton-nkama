import { createCachedAlgoliaSearchClient } from '@/lib/algolia-cached-search-client'

describe('createCachedAlgoliaSearchClient', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('poste { requests } au proxy quand appele avec un tableau (convention InstantSearch)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ hits: [] }] }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const client = createCachedAlgoliaSearchClient()
    const requests = [{ indexName: 'idx', params: { query: 'x' } }]
    const response = await client.search(requests)

    expect(fetchMock).toHaveBeenCalledWith('/api/algolia/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    })
    expect(response).toEqual({ results: [{ hits: [] }] })
  })

  it('extrait .requests quand appele avec { requests } (convention utilisee par les hooks de facettes)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ facets: {} }] }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const client = createCachedAlgoliaSearchClient()
    const requests = [{ indexName: 'idx', params: { hitsPerPage: 0 } }]
    await client.search({ requests })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/algolia/search',
      expect.objectContaining({ body: JSON.stringify({ requests }) }),
    )
  })

  it('leve une erreur explicite quand le proxy repond en erreur', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 }) as unknown as typeof fetch

    const client = createCachedAlgoliaSearchClient()
    await expect(client.search([{ indexName: 'idx', params: {} }])).rejects.toThrow('502')
  })
})
