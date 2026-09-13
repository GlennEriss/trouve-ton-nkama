import { emitAdsSlotEvent } from '@/features/analytics/ads/services/ads-slot-analytics.client'

jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn() }) }))
jest.mock('@/features/analytics/presence/services/presence-admin-analytics.client', () => ({
  getPresenceSessionId: () => 'session-1',
  resolvePresenceSource: () => 'catalog_search_page',
}))

function lastRequestBody(fetchMock: jest.Mock) {
  const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
  return JSON.parse((init as RequestInit).body as string)
}

describe('emitAdsSlotEvent — taxonomie page_template/slot_position (audit §5.3)', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it.each([
    ['/', 'home'],
    ['/reels', 'reels_feed'],
    ['/reels/abc123', 'reels_feed'],
    ['/search-with-ia', 'search_with_ia'],
    ['/search', 'catalog_search'],
    ['/houseDetails/abc123', 'property_detail'],
    ['/immobilier/libreville', 'immobilier_landing'],
    ['/blog/financement-immobilier-gabon', 'blog'],
    ['/some-unmapped-route', 'other'],
  ])('pathname %s -> page_template %s', (pathname, expected) => {
    emitAdsSlotEvent({ slotId: 'slot-1', slotKey: `key-${pathname}`, eventName: 'ad_slot_rendered', pathname })

    expect(lastRequestBody(fetchMock).events[0].page_template).toBe(expected)
  })

  it('une page Reels classe la position en reels_fullscreen meme avec un slotKey generique "ad-0"', () => {
    // Bug reel : ReelsFeedClient genere des cles de diapositive `ad-${index}` sans aucun indice
    // textuel "reel" — inferSlotPosition doit donc regarder le pathname, pas seulement slotKey.
    emitAdsSlotEvent({ slotId: 'slot-1', slotKey: 'ad-0', eventName: 'ad_slot_rendered', pathname: '/reels' })

    expect(lastRequestBody(fetchMock).events[0].slot_position).toBe('reels_fullscreen')
  })

  it.each([
    ['footer-/search', 'footer'],
    ['home-mobile', 'home_inline'],
    ['search-desktop-abc', 'in_feed'],
    ['immobilier-prop1-0', 'in_feed'],
    ['property-desktop-abc', 'detail_inline'],
    ['category-listing-abc', 'detail_inline'],
    ['something-else', 'other'],
  ])('slotKey %s (hors Reels) -> slot_position %s', (slotKey, expected) => {
    emitAdsSlotEvent({ slotId: 'slot-1', slotKey, eventName: 'ad_slot_rendered', pathname: '/search' })

    expect(lastRequestBody(fetchMock).events[0].slot_position).toBe(expected)
  })
})
