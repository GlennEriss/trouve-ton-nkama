import { trackPropertyInteraction, trackPropertyView } from '@/db/property-statistics.db'

let postView: typeof import('@/app/api/property/[id]/statistics/view/route').POST
let postInteraction: typeof import('@/app/api/property/[id]/statistics/interaction/route').POST

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })),
}))

jest.mock('@/db/property-statistics.db', () => ({
  trackPropertyView: jest.fn(),
  trackPropertyInteraction: jest.fn(),
}))

jest.mock('@/lib/server/statistics-actor', () => ({
  resolveStatisticsActor: jest.fn(() => 'actor-property'),
}))

function makeRequest(body: Record<string, unknown> = {}) {
  return {
    headers: { get: () => null },
    json: async () => body,
  } as any
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('/api/property/[id]/statistics', () => {
  beforeAll(async () => {
    ;({ POST: postView } = await import('@/app/api/property/[id]/statistics/view/route'))
    ;({ POST: postInteraction } = await import('@/app/api/property/[id]/statistics/interaction/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(trackPropertyView as jest.Mock).mockResolvedValue('tracked')
    ;(trackPropertyInteraction as jest.Mock).mockResolvedValue('tracked')
  })

  it('utilise l acteur serveur et ignore un userId fourni par le client', async () => {
    const response = await postView(
      makeRequest({ visitorId: 'ttn_valid_visitor_123', userId: 'owner-forged', duration: 15 }),
      params('property-1'),
    )

    expect(response.status).toBe(200)
    expect(trackPropertyView).toHaveBeenCalledWith('property-1', 'actor-property', expect.objectContaining({
      userId: 'actor-property',
      duration: 15,
    }))
  })

  it('accepte un doublon sans reincrementer', async () => {
    ;(trackPropertyView as jest.Mock).mockResolvedValue('duplicate')

    const response = await postView(makeRequest(), params('property-1'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, deduplicated: true })
  })

  it('valide le type d interaction', async () => {
    const response = await postInteraction(makeRequest({ type: 'invalid' }), params('property-1'))

    expect(response.status).toBe(400)
    expect(trackPropertyInteraction).not.toHaveBeenCalled()
  })

  it('transmet l acteur pour une interaction valide', async () => {
    const response = await postInteraction(
      makeRequest({ type: 'phone_contact', visitorId: 'ttn_valid_visitor_123' }),
      params('property-1'),
    )

    expect(response.status).toBe(200)
    expect(trackPropertyInteraction).toHaveBeenCalledWith(
      'property-1',
      'phone_contact',
      'actor-property',
      expect.any(Object),
    )
  })

  it.each([
    ['not-found', 404, 'PROPERTY_NOT_FOUND'],
    ['failed', 500, 'TRACK_VIEW_FAILED'],
  ])('traduit le resultat vue %s en HTTP %i', async (result, status, code) => {
    ;(trackPropertyView as jest.Mock).mockResolvedValue(result)

    const response = await postView(makeRequest(), params('property-1'))

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ success: false, error: { code } })
  })
})
