import {
  trackReelLike,
  trackReelShare,
  trackReelView,
} from '@/lib/statistics/reel-statistics.client'

const fetchMock = jest.fn()

function requestBodies() {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
}

describe('reel statistics client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: fetchMock,
    })
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    })
    fetchMock.mockResolvedValue({ ok: true })
  })

  it('envoie une seule vue persistante pour le meme reel', () => {
    trackReelView('reel-lot6c')
    trackReelView('reel-lot6c')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/reels/reel-lot6c/statistics/view')
    expect(requestBodies()[0]).toEqual({
      visitorId: expect.stringMatching(/^ttn_/),
    })
  })

  it('joint l identifiant visiteur aux likes et partages', async () => {
    await trackReelLike('reel-lot6c', true)
    trackReelShare('reel-lot6c', 'whatsapp')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestBodies()).toEqual([
      {
        liked: true,
        visitorId: expect.stringMatching(/^ttn_/),
      },
      {
        target: 'whatsapp',
        visitorId: expect.stringMatching(/^ttn_/),
      },
    ])
  })

  it('serialise deux changements de like rapides dans leur ordre', async () => {
    let resolveFirst: ((value: { ok: boolean }) => void) | undefined
    fetchMock
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve
      }))
      .mockResolvedValueOnce({ ok: true })

    const like = trackReelLike('reel-rapid-lot6c', true)
    const unlike = trackReelLike('reel-rapid-lot6c', false)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    resolveFirst?.({ ok: true })
    await Promise.all([like, unlike])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestBodies().map((body) => body.liked)).toEqual([true, false])
  })
})
