const searchMock = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))

jest.mock('algoliasearch/lite', () => ({
  liteClient: () => ({ search: (...args: unknown[]) => searchMock(...args) }),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

import { POST } from '@/app/api/algolia/search/route'

function makeRequest(body: unknown) {
  return { json: async () => body } as Request
}

function makeInvalidJsonRequest() {
  return { json: () => Promise.reject(new Error('bad json')) } as unknown as Request
}

describe('POST /api/algolia/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retourne un tableau de resultats vide sans appeler Algolia si aucune requete', async () => {
    const response = await POST(makeRequest({ requests: [] }))
    const payload = await response.json()

    expect(payload).toEqual({ results: [] })
    expect(searchMock).not.toHaveBeenCalled()
  })

  it('rejette un JSON invalide avec un 400', async () => {
    const response = await POST(makeInvalidJsonRequest())

    expect(response.status).toBe(400)
  })

  it('rejette un lot trop volumineux avec un 400', async () => {
    const requests = Array.from({ length: 21 }, (_, i) => ({ indexName: 'idx', params: { query: String(i) } }))
    const response = await POST(makeRequest({ requests }))

    expect(response.status).toBe(400)
    expect(searchMock).not.toHaveBeenCalled()
  })

  it('interroge Algolia pour une requete non cachee et retourne son resultat', async () => {
    searchMock.mockResolvedValue({ results: [{ hits: ['a-listing'] }] })

    const response = await POST(
      makeRequest({ requests: [{ indexName: 'idx', params: { query: 'route-test-unique-1' } }] }),
    )
    const payload = await response.json()

    expect(searchMock).toHaveBeenCalledTimes(1)
    expect(payload).toEqual({ results: [{ hits: ['a-listing'] }] })
  })

  it('renvoie un 502 si Algolia echoue', async () => {
    searchMock.mockRejectedValue(new Error('Algolia down'))

    const response = await POST(
      makeRequest({ requests: [{ indexName: 'idx', params: { query: 'route-test-unique-2' } }] }),
    )

    expect(response.status).toBe(502)
  })
})
