import {
  claimClientStatisticEvent,
  getOrCreateStatisticsVisitorId,
} from '@/lib/statistics/statistics-visitor.client'

describe('statistics visitor client', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('conserve le meme identifiant visiteur dans le navigateur', () => {
    const first = getOrCreateStatisticsVisitorId()
    const second = getOrCreateStatisticsVisitorId()

    expect(first).toBe(second)
    expect(first).toMatch(/^ttn_[a-zA-Z0-9_-]+$/)
  })

  it('refuse un doublon jusqu a l expiration puis autorise un nouvel evenement', () => {
    expect(claimClientStatisticEvent('reel:view:lot6c', 1_000, 10_000)).toBe(true)
    expect(claimClientStatisticEvent('reel:view:lot6c', 1_000, 10_999)).toBe(false)
    expect(claimClientStatisticEvent('reel:view:lot6c', 1_000, 11_000)).toBe(true)
  })

  it('preserve la duree propre de chaque evenement', () => {
    expect(claimClientStatisticEvent('ad:impression:lot6c', 30_000, 1_000)).toBe(true)
    expect(claimClientStatisticEvent('ad:click:lot6c', 5_000, 2_000)).toBe(true)
    expect(claimClientStatisticEvent('ad:impression:lot6c', 30_000, 7_001)).toBe(false)
  })
})
