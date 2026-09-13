import { resolveAdStackingDecision } from '@/lib/ads/stacking-experiment'

describe('resolveAdStackingDecision (audit §5.4/§9 Lot 3 — infra experience empilement/alternance)', () => {
  it('A_STACK (defaut) : empile toujours maison (si active) et AdSense', () => {
    expect(
      resolveAdStackingDecision({ placement: 'search_infeed', hasHouseCreative: true, variant: 'A_STACK' }),
    ).toEqual({ showHouse: true, showAdSense: true })

    expect(
      resolveAdStackingDecision({ placement: 'search_infeed', hasHouseCreative: false, variant: 'A_STACK' }),
    ).toEqual({ showHouse: false, showAdSense: true })
  })

  it('variante non reconnue ou absente retombe sur A_STACK (comportement historique inchange)', () => {
    expect(
      resolveAdStackingDecision({ placement: 'home', hasHouseCreative: true, variant: undefined }),
    ).toEqual({ showHouse: true, showAdSense: true })
  })

  describe('B_ALTERNATE', () => {
    it('index pair = tour maison (ou AdSense si pas de campagne active)', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'search_infeed',
          hasHouseCreative: true,
          rotationIndex: 0,
          variant: 'B_ALTERNATE',
        }),
      ).toEqual({ showHouse: true, showAdSense: false })

      expect(
        resolveAdStackingDecision({
          placement: 'search_infeed',
          hasHouseCreative: false,
          rotationIndex: 2,
          variant: 'B_ALTERNATE',
        }),
      ).toEqual({ showHouse: false, showAdSense: true })
    })

    it('index impair = tour AdSense, meme si une campagne maison est active (jamais empile)', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'search_infeed',
          hasHouseCreative: true,
          rotationIndex: 1,
          variant: 'B_ALTERNATE',
        }),
      ).toEqual({ showHouse: false, showAdSense: true })
    })

    it('sans rotationIndex (emplacement unique, ex. accueil/detail) retombe sur A_STACK', () => {
      expect(
        resolveAdStackingDecision({ placement: 'home', hasHouseCreative: true, variant: 'B_ALTERNATE' }),
      ).toEqual({ showHouse: true, showAdSense: true })
    })
  })

  describe('C_RESERVED', () => {
    const reservedHouse = new Set(['home'])
    const reservedAdSense = new Set(['search_infeed'])

    it('placement reserve maison : jamais AdSense', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'home',
          hasHouseCreative: true,
          variant: 'C_RESERVED',
          reservedHouse,
          reservedAdSense,
        }),
      ).toEqual({ showHouse: true, showAdSense: false })

      expect(
        resolveAdStackingDecision({
          placement: 'home',
          hasHouseCreative: false,
          variant: 'C_RESERVED',
          reservedHouse,
          reservedAdSense,
        }),
      ).toEqual({ showHouse: false, showAdSense: true })
    })

    it('placement reserve AdSense : jamais la maison meme si une campagne est active', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'search_infeed',
          hasHouseCreative: true,
          variant: 'C_RESERVED',
          reservedHouse,
          reservedAdSense,
        }),
      ).toEqual({ showHouse: false, showAdSense: true })
    })

    it('placement non reserve : retombe sur A_STACK', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'property_detail',
          hasHouseCreative: true,
          variant: 'C_RESERVED',
          reservedHouse,
          reservedAdSense,
        }),
      ).toEqual({ showHouse: true, showAdSense: true })
    })
  })

  describe('D_HOUSE_PRIORITY', () => {
    it('maison prioritaire, AdSense seulement en fallback (jamais empile)', () => {
      expect(
        resolveAdStackingDecision({ placement: 'home', hasHouseCreative: true, variant: 'D_HOUSE_PRIORITY' }),
      ).toEqual({ showHouse: true, showAdSense: false })

      expect(
        resolveAdStackingDecision({ placement: 'home', hasHouseCreative: false, variant: 'D_HOUSE_PRIORITY' }),
      ).toEqual({ showHouse: false, showAdSense: true })
    })
  })
})
