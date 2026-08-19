import { needsPromotionExpiry } from '../../src/promotions/expire-promotions.policy'

const HOUR = 60 * 60 * 1000
const NOW = 1_800_000_000_000

function ts(millis: number) {
  return { toMillis: () => millis }
}

describe('needsPromotionExpiry', () => {
  it('ignore une annonce sans promotion', () => {
    expect(needsPromotionExpiry({}, NOW)).toBe(false)
    expect(needsPromotionExpiry({ currentPromotion: null }, NOW)).toBe(false)
  })

  it('expire une mise a la une dont la date de fin est passee', () => {
    expect(
      needsPromotionExpiry(
        { currentPromotion: { type: 'featured', isActive: true, endDate: ts(NOW - HOUR) } },
        NOW,
      ),
    ).toBe(true)
  })

  it('expire une tendance (7j ou 3j) dont la date de fin est passee', () => {
    for (const type of ['trending-7d', 'trending-3d']) {
      expect(
        needsPromotionExpiry({ currentPromotion: { type, isActive: true, endDate: ts(NOW - HOUR) } }, NOW),
      ).toBe(true)
    }
  })

  it('laisse intacte une promotion encore dans sa fenetre', () => {
    expect(
      needsPromotionExpiry(
        { currentPromotion: { type: 'featured', isActive: true, endDate: ts(NOW + HOUR) } },
        NOW,
      ),
    ).toBe(false)
  })

  it('ignore une promotion deja marquee inactive (deja traitee)', () => {
    expect(
      needsPromotionExpiry(
        { currentPromotion: { type: 'featured', isActive: false, endDate: ts(NOW - HOUR) } },
        NOW,
      ),
    ).toBe(false)
  })

  it('exclut le boost, qui n a pas de fenetre active a expirer', () => {
    expect(
      needsPromotionExpiry(
        { currentPromotion: { type: 'boost', isActive: true, endDate: ts(NOW - HOUR) } },
        NOW,
      ),
    ).toBe(false)
  })

  it('gere un endDate expose en secondes (forme brute Firestore)', () => {
    expect(
      needsPromotionExpiry(
        { currentPromotion: { type: 'featured', isActive: true, endDate: { seconds: (NOW - HOUR) / 1000 } } },
        NOW,
      ),
    ).toBe(true)
  })

  it('traite une promotion sans endDate comme immediatement expirable', () => {
    expect(
      needsPromotionExpiry({ currentPromotion: { type: 'featured', isActive: true } }, NOW),
    ).toBe(true)
  })
})
