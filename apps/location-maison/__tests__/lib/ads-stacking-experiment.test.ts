import { resolveAdStackingDecision, resolveExperimentBucket } from '@/lib/ads/stacking-experiment'

describe('resolveAdStackingDecision (audit §5.4/§9 Lot 3 — infra experience empilement/alternance)', () => {
  it('A_STACK (defaut) : empile toujours maison (si active) et AdSense', () => {
    expect(
      resolveAdStackingDecision({ placement: 'search_infeed', hasHouseCreative: true, variant: 'A_STACK' }),
    ).toEqual({ showHouse: true, showAdSense: true, variant: 'A_STACK' })

    expect(
      resolveAdStackingDecision({ placement: 'search_infeed', hasHouseCreative: false, variant: 'A_STACK' }),
    ).toEqual({ showHouse: false, showAdSense: true, variant: 'A_STACK' })
  })

  it('variante non reconnue ou absente retombe sur A_STACK (comportement historique inchange)', () => {
    expect(
      resolveAdStackingDecision({ placement: 'home', hasHouseCreative: true, variant: undefined }),
    ).toEqual({ showHouse: true, showAdSense: true, variant: 'A_STACK' })
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
      ).toEqual({ showHouse: true, showAdSense: false, variant: 'B_ALTERNATE' })

      expect(
        resolveAdStackingDecision({
          placement: 'search_infeed',
          hasHouseCreative: false,
          rotationIndex: 2,
          variant: 'B_ALTERNATE',
        }),
      ).toEqual({ showHouse: false, showAdSense: true, variant: 'B_ALTERNATE' })
    })

    it('index impair = tour AdSense, meme si une campagne maison est active (jamais empile)', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'search_infeed',
          hasHouseCreative: true,
          rotationIndex: 1,
          variant: 'B_ALTERNATE',
        }),
      ).toEqual({ showHouse: false, showAdSense: true, variant: 'B_ALTERNATE' })
    })

    it('sans rotationIndex (emplacement unique, ex. accueil/detail) retombe sur la forme A_STACK', () => {
      expect(
        resolveAdStackingDecision({ placement: 'home', hasHouseCreative: true, variant: 'B_ALTERNATE' }),
      ).toEqual({ showHouse: true, showAdSense: true, variant: 'B_ALTERNATE' })
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
      ).toEqual({ showHouse: true, showAdSense: false, variant: 'C_RESERVED' })

      expect(
        resolveAdStackingDecision({
          placement: 'home',
          hasHouseCreative: false,
          variant: 'C_RESERVED',
          reservedHouse,
          reservedAdSense,
        }),
      ).toEqual({ showHouse: false, showAdSense: true, variant: 'C_RESERVED' })
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
      ).toEqual({ showHouse: false, showAdSense: true, variant: 'C_RESERVED' })
    })

    it('placement non reserve : retombe sur la forme A_STACK', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'property_detail',
          hasHouseCreative: true,
          variant: 'C_RESERVED',
          reservedHouse,
          reservedAdSense,
        }),
      ).toEqual({ showHouse: true, showAdSense: true, variant: 'C_RESERVED' })
    })
  })

  describe('D_HOUSE_PRIORITY', () => {
    it('maison prioritaire, AdSense seulement en fallback (jamais empile)', () => {
      expect(
        resolveAdStackingDecision({ placement: 'home', hasHouseCreative: true, variant: 'D_HOUSE_PRIORITY' }),
      ).toEqual({ showHouse: true, showAdSense: false, variant: 'D_HOUSE_PRIORITY' })

      expect(
        resolveAdStackingDecision({ placement: 'home', hasHouseCreative: false, variant: 'D_HOUSE_PRIORITY' }),
      ).toEqual({ showHouse: false, showAdSense: true, variant: 'D_HOUSE_PRIORITY' })
    })
  })

  describe('experience live A_STACK vs B_ALTERNATE (bucket 50/50 stable par session)', () => {
    it('sans experimentId configure, ignore le sessionId et retombe sur A_STACK global', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'search_infeed',
          hasHouseCreative: true,
          sessionId: 'session-1',
          experimentId: null,
        }),
      ).toEqual({ showHouse: true, showAdSense: true, variant: 'A_STACK' })
    })

    it('avec experimentId configure, un placement hors population (home) ignore le bucket', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'home',
          hasHouseCreative: true,
          sessionId: 'session-1',
          experimentId: 'ads-stacking-v1',
        }),
      ).toEqual({ showHouse: true, showAdSense: true, variant: 'A_STACK' })
    })

    it('avec experimentId configure, un placement eligible sans sessionId ignore le bucket', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'search_infeed',
          hasHouseCreative: true,
          experimentId: 'ads-stacking-v1',
        }),
      ).toEqual({ showHouse: true, showAdSense: true, variant: 'A_STACK' })
    })

    it('le meme sessionId retombe toujours dans le meme bucket (stable)', () => {
      const decisionA = resolveAdStackingDecision({
        placement: 'search_infeed',
        hasHouseCreative: true,
        rotationIndex: 0,
        sessionId: 'session-stable-1',
        experimentId: 'ads-stacking-v1',
      })
      const decisionB = resolveAdStackingDecision({
        placement: 'immobilier_infeed',
        hasHouseCreative: true,
        rotationIndex: 3,
        sessionId: 'session-stable-1',
        experimentId: 'ads-stacking-v1',
      })

      expect(decisionA.variant).toBe(decisionB.variant)
    })

    it('un explicit variant override prend le pas sur le bucket de session', () => {
      expect(
        resolveAdStackingDecision({
          placement: 'search_infeed',
          hasHouseCreative: true,
          sessionId: 'session-1',
          experimentId: 'ads-stacking-v1',
          variant: 'D_HOUSE_PRIORITY',
        }).variant,
      ).toBe('D_HOUSE_PRIORITY')
    })

    it('resolveExperimentBucket repartit deterministement A/B selon le session id', () => {
      const sessionIds = Array.from({ length: 500 }, (_, index) => `session-${index}`)
      const buckets = sessionIds.map(resolveExperimentBucket)
      const aCount = buckets.filter((bucket) => bucket === 'A_STACK').length

      expect(sessionIds.map(resolveExperimentBucket)).toEqual(buckets) // deterministe
      expect(aCount).toBeGreaterThan(150)
      expect(aCount).toBeLessThan(350)
    })
  })
})
