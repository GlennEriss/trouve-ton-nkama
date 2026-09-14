const loggerError = jest.fn()

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: loggerError }),
}))

const ENV_KEYS = [
  'NEXT_PUBLIC_APP_ENV',
  'NODE_ENV',
  'NEXT_PUBLIC_ADSENSE_SLOT_FOOTER',
  'NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_INLINE',
  'NEXT_PUBLIC_ADSENSE_SLOT_PROPERTY_DETAIL',
  'NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_AI',
  'NEXT_PUBLIC_ADSENSE_SLOT_IMMOBILIER_INLINE',
  'NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE',
  'NEXT_PUBLIC_ADSENSE_SLOT_STACKING_EXPERIMENT_B',
] as const

type EnvOverrides = Partial<Record<(typeof ENV_KEYS)[number], string>>

function loadConfigWithEnv(overrides: EnvOverrides) {
  const original: Record<string, string | undefined> = {}
  for (const key of ENV_KEYS) {
    original[key] = process.env[key]
    delete process.env[key]
  }
  Object.assign(process.env as Record<string, string | undefined>, overrides)

  let mod: typeof import('@/lib/ads/config')
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('@/lib/ads/config')
  })

  const mutableEnv = process.env as Record<string, string | undefined>
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) {
      delete mutableEnv[key]
    } else {
      mutableEnv[key] = original[key]
    }
  }

  return mod!
}

describe('lib/ads/config', () => {
  beforeEach(() => {
    loggerError.mockClear()
  })

  it('utilise les slots explicitement configures sans alerte', () => {
    const { ADSENSE_SLOTS } = loadConfigWithEnv({
      NODE_ENV: 'production',
      NEXT_PUBLIC_ADSENSE_SLOT_FOOTER: 'footer-id',
      NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_INLINE: 'search-id',
      NEXT_PUBLIC_ADSENSE_SLOT_PROPERTY_DETAIL: 'property-id',
      NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_AI: 'search-ai-id',
      NEXT_PUBLIC_ADSENSE_SLOT_IMMOBILIER_INLINE: 'immobilier-id',
      NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE: 'reels-id',
    })

    expect(ADSENSE_SLOTS).toMatchObject({
      footer: 'footer-id',
      searchInline: 'search-id',
      propertyDetail: 'property-id',
      searchAi: 'search-ai-id',
      immobilierInline: 'immobilier-id',
      reelsInline: 'reels-id',
    })
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('en production, un slot manquant retombe sur une autre surface ET declenche une alerte explicite (plus de fallback silencieux)', () => {
    // Audit AUDIT-ADSENSE-REVENUS-2026-09.md §5.1/§5.5 : NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE
    // n'existe dans aucun .env de prod -> reelsInline retombe sur footerSlot, mais desormais de
    // facon bruyante (logger.error), plus jamais silencieuse.
    const { ADSENSE_SLOTS } = loadConfigWithEnv({
      NODE_ENV: 'production',
      NEXT_PUBLIC_ADSENSE_SLOT_FOOTER: 'footer-id',
    })

    expect(ADSENSE_SLOTS.reelsInline).toBe('footer-id')
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('reels_inline'),
      expect.objectContaining({ envVar: 'NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE' }),
    )
  })

  it('en developpement, le meme slot manquant retombe sans generer d alerte', () => {
    const { ADSENSE_SLOTS } = loadConfigWithEnv({
      NODE_ENV: 'development',
      NEXT_PUBLIC_ADSENSE_SLOT_FOOTER: 'footer-id',
    })

    expect(ADSENSE_SLOTS.reelsInline).toBe('footer-id')
    expect(loggerError).not.toHaveBeenCalled()
  })

  describe('ADSENSE_SLOT_STACKING_EXPERIMENT_B', () => {
    it('vaut null sans configuration, sans alerte specifique a ce slot (pas un slot requis)', () => {
      const { ADSENSE_SLOT_STACKING_EXPERIMENT_B } = loadConfigWithEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_ADSENSE_SLOT_FOOTER: 'footer-id',
        NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_INLINE: 'search-id',
        NEXT_PUBLIC_ADSENSE_SLOT_PROPERTY_DETAIL: 'property-id',
        NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_AI: 'search-ai-id',
        NEXT_PUBLIC_ADSENSE_SLOT_IMMOBILIER_INLINE: 'immobilier-id',
        NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE: 'reels-id',
      })

      expect(ADSENSE_SLOT_STACKING_EXPERIMENT_B).toBeNull()
      expect(loggerError).not.toHaveBeenCalled()
    })

    it('expose l identifiant configure tel quel', () => {
      const { ADSENSE_SLOT_STACKING_EXPERIMENT_B } = loadConfigWithEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_ADSENSE_SLOT_STACKING_EXPERIMENT_B: '5664198630',
      })

      expect(ADSENSE_SLOT_STACKING_EXPERIMENT_B).toBe('5664198630')
    })
  })
})
