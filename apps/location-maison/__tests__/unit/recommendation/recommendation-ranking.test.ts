import { resolveBaselineTrafficPercent, resolveRankingVariant } from '@/lib/server/recommendation-ranking'

describe('resolveRankingVariant', () => {
  it('est stable : le même actorId reçoit toujours la même variante', () => {
    const first = resolveRankingVariant('actor-1', 20, 'baseline-v1')
    const second = resolveRankingVariant('actor-1', 20, 'baseline-v1')
    expect(second).toBe(first)
  })

  it('respecte approximativement le pourcentage de trafic sur un grand échantillon', () => {
    const total = 5000
    let baselineCount = 0
    for (let i = 0; i < total; i += 1) {
      if (resolveRankingVariant(`actor-${i}`, 20, 'baseline-v1') === 'baseline') {
        baselineCount += 1
      }
    }
    const ratio = baselineCount / total
    expect(ratio).toBeGreaterThan(0.15)
    expect(ratio).toBeLessThan(0.25)
  })

  it('renvoie toujours control quand le pourcentage de trafic est 0 (kill switch)', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(resolveRankingVariant(`actor-${i}`, 0, 'baseline-v1')).toBe('control')
    }
  })

  it('renvoie toujours baseline quand le pourcentage de trafic est 100', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(resolveRankingVariant(`actor-${i}`, 100, 'baseline-v1')).toBe('baseline')
    }
  })

  it('change la répartition possible quand la version de config change (même actorId)', () => {
    // Pas une garantie que ça change systématiquement (dépend du hash), mais vérifie qu'au moins
    // un sous-ensemble d'acteurs bascule bien de variante entre deux versions.
    let changed = 0
    for (let i = 0; i < 200; i += 1) {
      const a = resolveRankingVariant(`actor-${i}`, 20, 'baseline-v1')
      const b = resolveRankingVariant(`actor-${i}`, 20, 'baseline-v2')
      if (a !== b) changed += 1
    }
    expect(changed).toBeGreaterThan(0)
  })
})

describe('resolveBaselineTrafficPercent', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
  })

  it('retourne 20 par défaut', () => {
    process.env = { ...originalEnv, RECOMMENDATION_BASELINE_TRAFFIC_PERCENT: undefined }
    delete process.env.RECOMMENDATION_BASELINE_TRAFFIC_PERCENT
    expect(resolveBaselineTrafficPercent()).toBe(20)
  })

  it('lit la valeur configurée et la borne entre 0 et 100', () => {
    process.env = { ...originalEnv, RECOMMENDATION_BASELINE_TRAFFIC_PERCENT: '5' }
    expect(resolveBaselineTrafficPercent()).toBe(5)

    process.env = { ...originalEnv, RECOMMENDATION_BASELINE_TRAFFIC_PERCENT: '150' }
    expect(resolveBaselineTrafficPercent()).toBe(100)

    process.env = { ...originalEnv, RECOMMENDATION_BASELINE_TRAFFIC_PERCENT: '-10' }
    expect(resolveBaselineTrafficPercent()).toBe(0)
  })

  it('retombe sur la valeur par défaut si la variable est invalide', () => {
    process.env = { ...originalEnv, RECOMMENDATION_BASELINE_TRAFFIC_PERCENT: 'not-a-number' }
    expect(resolveBaselineTrafficPercent()).toBe(20)
  })
})
