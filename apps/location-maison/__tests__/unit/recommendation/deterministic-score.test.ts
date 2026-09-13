import { computeDeterministicScore } from '@/features/recommendation/scoring/deterministic-score'
import { BASELINE_SCORE_CONFIG_V1 } from '@/features/recommendation/scoring/score-config'
import { buildCandidate, buildContext, NOW } from '../../fixtures/recommendation/candidates'

describe('computeDeterministicScore', () => {
  it('retourne un score dans [0,1] avec le breakdown et la version de config', () => {
    const result = computeDeterministicScore(buildCandidate(), buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
    expect(result.configVersion).toBe('baseline-v1')
    expect(result.listingId).toBe('listing-1')
    for (const value of Object.values(result.breakdown)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it('donne une meilleure pertinence à une catégorie qui correspond exactement', () => {
    const matching = computeDeterministicScore(
      buildCandidate({ categoryLvl0: 'immobilier' }),
      buildContext({ categoryLvl0: 'immobilier' }),
      BASELINE_SCORE_CONFIG_V1,
      NOW,
    )
    const mismatching = computeDeterministicScore(
      buildCandidate({ categoryLvl0: 'mode' }),
      buildContext({ categoryLvl0: 'immobilier' }),
      BASELINE_SCORE_CONFIG_V1,
      NOW,
    )

    expect(matching.breakdown.relevance).toBeGreaterThan(mismatching.breakdown.relevance)
  })

  it('récompense un prix proche du centre de la fourchette budgétaire', () => {
    const centered = computeDeterministicScore(
      buildCandidate({ price: 150000 }),
      buildContext({ budgetMin: 100000, budgetMax: 200000 }),
      BASELINE_SCORE_CONFIG_V1,
      NOW,
    )
    const edge = computeDeterministicScore(
      buildCandidate({ price: 199000 }),
      buildContext({ budgetMin: 100000, budgetMax: 200000 }),
      BASELINE_SCORE_CONFIG_V1,
      NOW,
    )

    expect(centered.breakdown.budgetProximity).toBeGreaterThan(edge.breakdown.budgetProximity)
  })

  it('fait décroître la récence avec l’âge de l’annonce', () => {
    const recent = computeDeterministicScore(
      buildCandidate({ createdAtMs: NOW - 24 * 60 * 60 * 1000 }),
      buildContext(),
      BASELINE_SCORE_CONFIG_V1,
      NOW,
    )
    const old = computeDeterministicScore(
      buildCandidate({ createdAtMs: NOW - 180 * 24 * 60 * 60 * 1000 }),
      buildContext(),
      BASELINE_SCORE_CONFIG_V1,
      NOW,
    )

    expect(recent.breakdown.recency).toBeGreaterThan(old.breakdown.recency)
  })

  it('donne un score d’exploration maximal à une annonce nouvelle, même sans aucun historique utilisateur', () => {
    const newListing = computeDeterministicScore(
      buildCandidate({ createdAtMs: NOW - 2 * 24 * 60 * 60 * 1000, engagement: undefined }),
      buildContext({ profile: undefined }),
      BASELINE_SCORE_CONFIG_V1,
      NOW,
    )
    const oldListing = computeDeterministicScore(
      buildCandidate({ createdAtMs: NOW - 60 * 24 * 60 * 60 * 1000, engagement: undefined }),
      buildContext({ profile: undefined }),
      BASELINE_SCORE_CONFIG_V1,
      NOW,
    )

    expect(newListing.breakdown.exploration).toBe(1)
    expect(oldListing.breakdown.exploration).toBe(0)
  })

  it('reste neutre (0.5) sur les composantes sans signal, sans jamais produire NaN/Infinity', () => {
    const minimalCandidate = buildCandidate({
      categoryLvl0: undefined,
      city: undefined,
      province: undefined,
      price: undefined,
      createdAtMs: undefined,
      engagement: undefined,
      imageCount: 0,
    })
    const emptyContext = buildContext({
      categoryLvl0: undefined,
      city: undefined,
      province: undefined,
      budgetMin: undefined,
      budgetMax: undefined,
      profile: undefined,
    })

    const result = computeDeterministicScore(minimalCandidate, emptyContext, BASELINE_SCORE_CONFIG_V1, NOW)

    expect(Number.isFinite(result.score)).toBe(true)
    for (const value of Object.values(result.breakdown)) {
      expect(Number.isFinite(value)).toBe(true)
    }
    expect(result.breakdown.relevance).toBe(0.5)
    expect(result.breakdown.budgetProximity).toBe(0.5)
    expect(result.breakdown.geoMatch).toBe(0.5)
  })

  it('ne produit jamais NaN/Infinity sur un large éventail de fixtures dégradées', () => {
    const degradedCandidates = [
      buildCandidate({ price: 0 }),
      buildCandidate({ price: -1 }),
      buildCandidate({ createdAtMs: NOW + 1000 }), // horloge client en avance
      buildCandidate({ imageCount: -3 }),
      buildCandidate({ engagement: { impressions: 0, interactions: 0 } }),
      buildCandidate({ engagement: { impressions: 5, interactions: 50 } }), // incohérent mais ne doit pas planter
    ]

    for (const candidate of degradedCandidates) {
      const result = computeDeterministicScore(candidate, buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)
      expect(Number.isFinite(result.score)).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    }
  })

  it('est déterministe : même entrée, même sortie', () => {
    const a = computeDeterministicScore(buildCandidate(), buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)
    const b = computeDeterministicScore(buildCandidate(), buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)
    expect(a).toEqual(b)
  })
})
