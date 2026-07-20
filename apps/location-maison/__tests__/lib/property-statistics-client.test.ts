import {
  trackPropertyInteractionStatistic,
  trackPropertyViewStatistic,
} from '@/lib/statistics/property-statistics.client'

const fetchMock = jest.fn()

function requestBodies() {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
}

describe('property statistics client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock })
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: undefined })
    fetchMock.mockResolvedValue({ ok: true })
  })

  it('envoie une seule vue persistante pour la meme annonce', () => {
    expect(trackPropertyViewStatistic('property-1', { duration: 12 })).toBe(true)
    expect(trackPropertyViewStatistic('property-1', { duration: 30 })).toBe(false)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/property/property-1/statistics/view')
    expect(requestBodies()[0]).toEqual({
      duration: 12,
      visitorId: expect.stringMatching(/^ttn_/),
    })
  })

  it('deduplique un double clic mais distingue les types d interaction', () => {
    expect(trackPropertyInteractionStatistic('property-1', 'phone_contact')).toBe(true)
    expect(trackPropertyInteractionStatistic('property-1', 'phone_contact')).toBe(false)
    expect(trackPropertyInteractionStatistic('property-1', 'whatsapp_contact')).toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestBodies().map((body) => body.type)).toEqual([
      'phone_contact',
      'whatsapp_contact',
    ])
    expect(requestBodies()[0].visitorId).toMatch(/^ttn_/)
  })
})
