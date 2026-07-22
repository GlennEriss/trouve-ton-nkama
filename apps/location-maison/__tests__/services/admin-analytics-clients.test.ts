import { trackSearchAnalytics } from '@/features/analytics/search/services/search-admin-analytics.client'
import { trackTrafficPage } from '@/features/analytics/traffic/services/traffic-admin-analytics.client'

const mockWarn = jest.fn()
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: (...args: any[]) => mockWarn(...args) }) }))
jest.mock('@/features/analytics/presence/services/presence-admin-analytics.client', () => ({ getPresenceSessionId: () => 'presence-session' }))

const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

describe('clients analytics administratifs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
  })

  it('émet page vue, visite et visiteur unique vers Vercel et Firebase', async () => {
    Object.defineProperty(document, 'referrer', { configurable: true, value: 'https://facebook.com/post/1' })
    trackTrafficPage({ pathname: 'property/one', actor: { uid: 'u1', isAuthenticated: true } })
    await flush()
    expect(fetch).toHaveBeenCalledTimes(2)
    const bodies = (fetch as jest.Mock).mock.calls.map((call) => JSON.parse(call[1].body))
    expect(bodies[0]).toMatchObject({ provider: 'vercel', session: { session_id: 'presence-session' }, actor: { actor_id: 'u1', is_authenticated: true } })
    expect(bodies[0].visits.map((event: any) => event.metric_name)).toEqual(['page_view', 'visit', 'unique_visitor'])
    expect(bodies[0].visits[0]).toMatchObject({ page_path: '/property/one', referrer_host: 'facebook.com', device_category: 'desktop' })
    expect(bodies[1].provider).toBe('firebase')
  })

  it('déduplique la même vue et ne répète pas visite/visiteur', async () => {
    trackTrafficPage({ pathname: '/first', actor: { uid: null, isAuthenticated: false } })
    await flush()
    trackTrafficPage({ pathname: '/first', actor: { uid: null, isAuthenticated: false } })
    trackTrafficPage({ pathname: '/second', actor: { uid: null, isAuthenticated: false } })
    await flush()
    expect(fetch).toHaveBeenCalledTimes(4)
    const lastBody = JSON.parse((fetch as jest.Mock).mock.calls[2][1].body)
    expect(lastBody.visits.map((event: any) => event.metric_name)).toEqual(['page_view'])
  })

  it('journalise les refus HTTP et les pannes réseau traffic', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => { throw new Error('not json') } })
      .mockRejectedValueOnce(new Error('offline'))
    trackTrafficPage({ pathname: '', actor: { uid: null, isAuthenticated: false } })
    await flush()
    expect(mockWarn).toHaveBeenCalledTimes(2)
  })

  it('ignore les recherches sans intention, invalides ou encore en chargement', () => {
    const base = { searchParams: new URLSearchParams(), nbHits: 2, searchStatus: 'idle', actor: { uid: null, isAuthenticated: false } }
    trackSearchAnalytics({ ...base, searchStatus: 'loading' })
    trackSearchAnalytics({ ...base, nbHits: -1 })
    trackSearchAnalytics(base)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('normalise une recherche multi-filtres et l’émet après debounce', async () => {
    jest.useFakeTimers()
    const params = new URLSearchParams('q=maison&tags=Jardin&tags=Piscine&searchSource=location_maison_search_bar&empty=')
    trackSearchAnalytics({ searchParams: params, nbHits: 4.9, searchStatus: 'idle', actor: { uid: 'u1', isAuthenticated: true } })
    expect(fetch).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(551)
    expect(fetch).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)
    expect(body).toMatchObject({ environment: 'dev', actor: { actor_id: 'u1' }, search: { source: 'location_maison_search_bar', query_text_raw: 'maison', query_params: { q: 'maison', tags: ['Jardin', 'Piscine'] } }, result: { results_count: 4, engine: 'algolia' } })
    jest.useRealTimers()
  })

  it('annule le debounce précédent et déduplique un envoi récent réussi', async () => {
    jest.useFakeTimers()
    const first = new URLSearchParams('city=Libreville')
    const second = new URLSearchParams('city=Owendo')
    trackSearchAnalytics({ searchParams: first, nbHits: 2, searchStatus: 'idle', actor: { uid: null, isAuthenticated: false } })
    trackSearchAnalytics({ searchParams: second, nbHits: 1, searchStatus: 'idle', actor: { uid: null, isAuthenticated: false } })
    await jest.advanceTimersByTimeAsync(551)
    await flush()
    expect(fetch).toHaveBeenCalledTimes(1)
    trackSearchAnalytics({ searchParams: second, nbHits: 1, searchStatus: 'idle', actor: { uid: null, isAuthenticated: false } })
    await jest.advanceTimersByTimeAsync(551)
    expect(fetch).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('journalise un refus et une panne de recherche sans les marquer comme envoyés', async () => {
    jest.useFakeTimers()
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503, json: async () => { throw new Error('bad') } })
    trackSearchAnalytics({ searchParams: new URLSearchParams('province=Estuaire'), nbHits: 0, searchStatus: 'idle', actor: { uid: null, isAuthenticated: false } })
    await jest.advanceTimersByTimeAsync(551); await flush()
    expect(mockWarn).toHaveBeenCalled()
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'))
    trackSearchAnalytics({ searchParams: new URLSearchParams('province=Haut-Ogooue'), nbHits: 0, searchStatus: 'idle', actor: { uid: null, isAuthenticated: false } })
    await jest.advanceTimersByTimeAsync(551); await flush()
    expect(mockWarn).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
  })
})
