export {}

let requestsPOST: typeof import('@/app/api/recommendations/requests/route').POST
let eventsPOST: typeof import('@/app/api/recommendations/events/route').POST

const forwardToRecommendationAnalytics = jest.fn(async (..._args: unknown[]) => undefined)
const authMock = jest.fn(async () => null as { user?: { email?: string } } | null)

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn() }) }))
jest.mock('@/next-auth/auth', () => ({ auth: () => authMock() }))
jest.mock('@/lib/server/recommendation-analytics-forwarder', () => ({
  forwardToRecommendationAnalytics: (...args: unknown[]) => forwardToRecommendationAnalytics(...args),
}))

function fakeRequest(body: unknown, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
    json: async () => body,
  } as any
}

const NOW_ISO = '2026-09-13T10:00:00.000Z'

async function registerRequest(overrides: Record<string, unknown> = {}) {
  const response = await requestsPOST(
    fakeRequest({
      context: 'search',
      candidates: [
        { listingId: 'listing-1', position: 0 },
        { listingId: 'listing-2', position: 1 },
      ],
      visitorId: 'ttn_visitor_test_0000001',
      ...overrides,
    }),
  )
  const payload = await response.json()
  return { response, payload }
}

function buildEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 'evt-1',
    eventName: 'recommendation_impression',
    recommendationRequestId: 'placeholder',
    listingId: 'listing-1',
    rankingVariant: 'control',
    rankingVersion: 'pre-baseline-v0',
    occurredAt: NOW_ISO,
    ...overrides,
  }
}

describe('POST /api/recommendations/requests + /api/recommendations/events', () => {
  const originalEnv = process.env

  beforeAll(async () => {
    // Trafic baseline à 0% par défaut : garde les tests Phase 1 déterministes (toujours
    // 'control'). Les tests Phase 2 dédiés ci-dessous forcent 100% pour tester le reclassement.
    process.env = { ...originalEnv, CACHE_BACKEND: 'memory', RECOMMENDATION_BASELINE_TRAFFIC_PERCENT: '0' }
    ;({ POST: requestsPOST } = await import('@/app/api/recommendations/requests/route'))
    ;({ POST: eventsPOST } = await import('@/app/api/recommendations/events/route'))
  })

  afterAll(() => {
    process.env = originalEnv
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('enregistre une requête servie et retourne un recommendationRequestId, variante control', async () => {
    const { response, payload } = await registerRequest()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(typeof payload.recommendationRequestId).toBe('string')
    expect(payload.rankingVariant).toBe('control')
    expect(payload.rankingVersion).toBe('pre-baseline-v0')
    expect(forwardToRecommendationAnalytics).toHaveBeenCalledWith(
      'requests',
      expect.objectContaining({ recommendation_request_id: payload.recommendationRequestId }),
      payload.recommendationRequestId,
    )
  })

  it('rejette un corps de requête invalide (candidats manquants)', async () => {
    const response = await requestsPOST(fakeRequest({ context: 'search', candidates: [] }))
    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  it('accepte une impression pour une annonce réellement servie par cette requête', async () => {
    const { payload: requestPayload } = await registerRequest()

    const response = await eventsPOST(
      fakeRequest({
        events: [buildEvent({ recommendationRequestId: requestPayload.recommendationRequestId })],
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({ success: true, accepted: 1, rejected: 0 })
    expect(forwardToRecommendationAnalytics).toHaveBeenLastCalledWith(
      'events',
      expect.objectContaining({
        events: [expect.objectContaining({ listing_id: 'listing-1' })],
      }),
      expect.any(String),
    )
  })

  it("refuse un event dont l'annonce n'a jamais été servie dans cette requête", async () => {
    const { payload: requestPayload } = await registerRequest()

    forwardToRecommendationAnalytics.mockClear()
    const response = await eventsPOST(
      fakeRequest({
        events: [
          buildEvent({
            eventId: 'evt-not-served',
            recommendationRequestId: requestPayload.recommendationRequestId,
            listingId: 'listing-not-served',
          }),
        ],
      }),
    )

    const payload = await response.json()
    expect(payload).toMatchObject({ success: true, accepted: 0, rejected: 1 })
    expect(payload.rejections[0].reason).toBe('LISTING_NOT_IN_REQUEST')
    // Aucun event accepté dans ce batch : rien à transmettre vers BigQuery.
    expect(forwardToRecommendationAnalytics).not.toHaveBeenCalledWith('events', expect.anything(), expect.anything())
  })

  it("refuse un event pour un recommendationRequestId jamais enregistré", async () => {
    const response = await eventsPOST(
      fakeRequest({
        events: [buildEvent({ recommendationRequestId: 'never-registered' })],
      }),
    )

    const payload = await response.json()
    expect(payload).toMatchObject({ accepted: 0, rejected: 1 })
    expect(payload.rejections[0].reason).toBe('LISTING_NOT_IN_REQUEST')
  })

  it('ignore silencieusement le rejeu du même eventId (idempotence), sans jamais bloquer', async () => {
    const { payload: requestPayload } = await registerRequest()
    const event = buildEvent({
      eventId: 'evt-idempotence-check',
      recommendationRequestId: requestPayload.recommendationRequestId,
    })

    const first = await eventsPOST(fakeRequest({ events: [event] }))
    const second = await eventsPOST(fakeRequest({ events: [event] }))

    expect(await first.json()).toMatchObject({ success: true, accepted: 1, rejected: 0 })
    const secondPayload = await second.json()
    expect(secondPayload).toMatchObject({ success: true, accepted: 0, rejected: 1 })
    expect(secondPayload.rejections[0].reason).toBe('DUPLICATE_EVENT_ID')
  })

  it('accepte un batch mêlant clic et contact sur la même requête servie', async () => {
    const { payload: requestPayload } = await registerRequest()

    const response = await eventsPOST(
      fakeRequest({
        events: [
          buildEvent({
            eventId: 'evt-click',
            eventName: 'recommendation_click',
            recommendationRequestId: requestPayload.recommendationRequestId,
            listingId: 'listing-1',
          }),
          buildEvent({
            eventId: 'evt-contact',
            eventName: 'recommendation_contact_whatsapp',
            recommendationRequestId: requestPayload.recommendationRequestId,
            listingId: 'listing-2',
          }),
        ],
      }),
    )

    const payload = await response.json()
    expect(payload).toMatchObject({ success: true, accepted: 2, rejected: 0 })
  })

  it('rejette un corps invalide pour /events (eventName inconnu)', async () => {
    const response = await eventsPOST(
      fakeRequest({ events: [buildEvent({ eventName: 'not_a_real_event' })] }),
    )
    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  describe('Phase 2 — variante baseline (RECOMMENDATION_BASELINE_TRAFFIC_PERCENT=100)', () => {
    beforeEach(() => {
      process.env.RECOMMENDATION_BASELINE_TRAFFIC_PERCENT = '100'
    })

    afterEach(() => {
      process.env.RECOMMENDATION_BASELINE_TRAFFIC_PERCENT = '0'
    })

    it('reclasse les candidats et renvoie orderedListingIds avec ranking_version=baseline-v1', async () => {
      const { payload } = await registerRequest({
        candidates: [
          { listingId: 'old-listing', position: 0, createdAtMs: Date.now() - 300 * 24 * 60 * 60 * 1000, imageCount: 0, state: 'IN_PROGRESS', moderationStatus: 'APPROVED' },
          { listingId: 'fresh-listing', position: 1, createdAtMs: Date.now() - 1 * 24 * 60 * 60 * 1000, imageCount: 6, state: 'IN_PROGRESS', moderationStatus: 'APPROVED' },
        ],
      })

      expect(payload.rankingVariant).toBe('baseline')
      expect(payload.rankingVersion).toBe('baseline-v1')
      expect(payload.orderedListingIds).toEqual(['fresh-listing', 'old-listing'])
    })

    it('ne renvoie jamais un candidat hors contraintes dans orderedListingIds', async () => {
      const { payload } = await registerRequest({
        scoringContext: { categoryLvl0: 'immobilier' },
        candidates: [
          { listingId: 'wrong-category', position: 0, categoryLvl0: 'mode', state: 'IN_PROGRESS', moderationStatus: 'APPROVED' },
          { listingId: 'archived-listing', position: 1, categoryLvl0: 'immobilier', state: 'ARCHIVED', moderationStatus: 'APPROVED' },
          { listingId: 'eligible-listing', position: 2, categoryLvl0: 'immobilier', state: 'IN_PROGRESS', moderationStatus: 'APPROVED' },
        ],
      })

      expect(payload.orderedListingIds).toEqual(['eligible-listing'])
    })

    it('journalise la variante et version réellement utilisées (baseline-v1) vers BigQuery', async () => {
      await registerRequest()
      expect(forwardToRecommendationAnalytics).toHaveBeenCalledWith(
        'requests',
        expect.objectContaining({ ranking_variant: 'baseline', ranking_version: 'baseline-v1' }),
        expect.any(String),
      )
    })
  })

  describe('Compte forcé en baseline (RECOMMENDATION_FORCED_BASELINE_EMAILS)', () => {
    beforeEach(() => {
      process.env.RECOMMENDATION_FORCED_BASELINE_EMAILS = 'glenneriss@gmail.com'
    })

    afterEach(() => {
      delete process.env.RECOMMENDATION_FORCED_BASELINE_EMAILS
      authMock.mockResolvedValue(null)
    })

    it('place un compte de la liste blanche en baseline même si le tirage normal dirait control', async () => {
      authMock.mockResolvedValue({ user: { email: 'glenneriss@gmail.com' } })

      const { payload } = await registerRequest()

      expect(payload.rankingVariant).toBe('baseline')
      expect(payload.rankingVersion).toBe('baseline-v1')
    })

    it("n'affecte pas un compte hors liste blanche", async () => {
      authMock.mockResolvedValue({ user: { email: 'quelquun-dautre@exemple.com' } })

      const { payload } = await registerRequest()

      expect(payload.rankingVariant).toBe('control')
    })
  })
})
