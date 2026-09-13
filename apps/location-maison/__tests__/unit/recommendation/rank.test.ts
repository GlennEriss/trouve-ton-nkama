import { rankCandidates } from '@/features/recommendation/scoring/rank'
import { BASELINE_SCORE_CONFIG_V1 } from '@/features/recommendation/scoring/score-config'
import { buildCandidate, buildContext, NOW } from '../../fixtures/recommendation/candidates'

describe('rankCandidates', () => {
  it('ne retourne jamais un candidat hors filtre, même s’il aurait un score excellent', () => {
    const candidates = [
      buildCandidate({ listingId: 'eligible-1' }),
      buildCandidate({ listingId: 'wrong-category', categoryLvl0: 'mode', price: 150000, imageCount: 10 }),
      buildCandidate({ listingId: 'eligible-2' }),
    ]

    const ranked = rankCandidates(candidates, buildContext({ categoryLvl0: 'immobilier' }), BASELINE_SCORE_CONFIG_V1, NOW)

    expect(ranked.map((r) => r.listingId)).not.toContain('wrong-category')
    expect(ranked).toHaveLength(2)
  })

  it('trie par score décroissant', () => {
    const candidates = [
      buildCandidate({ listingId: 'old', createdAtMs: NOW - 300 * 24 * 60 * 60 * 1000, imageCount: 0 }),
      buildCandidate({ listingId: 'fresh', createdAtMs: NOW - 1 * 24 * 60 * 60 * 1000, imageCount: 8 }),
    ]

    const ranked = rankCandidates(candidates, buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)

    expect(ranked[0].listingId).toBe('fresh')
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score)
  })

  it('est stable : deux exécutions sur la même entrée donnent exactement le même ordre', () => {
    const candidates = Array.from({ length: 12 }, (_, i) =>
      buildCandidate({ listingId: `listing-${i}`, advertiserId: `advertiser-${i % 3}`, price: 150000 + i * 100 }),
    )

    const first = rankCandidates(candidates, buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)
    const second = rankCandidates(candidates, buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)

    expect(second).toEqual(first)
  })

  it('ne place jamais plus de deux annonces consécutives du même annonceur quand le catalogue le permet', () => {
    const candidates = Array.from({ length: 12 }, (_, i) =>
      buildCandidate({
        listingId: `listing-${i}`,
        advertiserId: `advertiser-${i % 3}`,
        price: 150000 + i,
      }),
    )

    const ranked = rankCandidates(candidates, buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)

    let consecutive = 0
    let lastAdvertiser: string | undefined
    for (const listing of ranked) {
      const candidate = candidates.find((c) => c.listingId === listing.listingId)!
      if (candidate.advertiserId === lastAdvertiser) {
        consecutive += 1
      } else {
        consecutive = 1
        lastAdvertiser = candidate.advertiserId
      }
      expect(consecutive).toBeLessThanOrEqual(2)
    }
  })

  it('quand un annonceur domine le catalogue, dégrade la diversité plutôt que de perdre des candidats éligibles', () => {
    const candidates = Array.from({ length: 9 }, (_, i) =>
      buildCandidate({ listingId: `listing-${i}`, advertiserId: 'dominant-advertiser', price: 150000 + i }),
    ).concat([buildCandidate({ listingId: 'other-advertiser-1', advertiserId: 'someone-else', price: 150005 })])

    const ranked = rankCandidates(candidates, buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)

    // Aucun candidat éligible n'est perdu, même si la contrainte de diversité ne peut pas être
    // tenue faute d'annonceurs alternatifs (voir le commentaire de fallback dans diversity.ts).
    expect(ranked).toHaveLength(candidates.length)
  })

  it('ne retourne jamais le même listingId deux fois, même si les candidats en entrée sont dupliqués (pagination)', () => {
    const candidates = [
      buildCandidate({ listingId: 'dup-1' }),
      buildCandidate({ listingId: 'dup-1' }),
      buildCandidate({ listingId: 'unique-1' }),
    ]

    const ranked = rankCandidates(candidates, buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)
    const ids = ranked.map((r) => r.listingId)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('fonctionne sans profil ni historique (utilisateur anonyme) sans planter et sans NaN', () => {
    const candidates = [buildCandidate(), buildCandidate({ listingId: 'listing-2' })]
    const anonymousContext = buildContext({ profile: undefined })

    const ranked = rankCandidates(candidates, anonymousContext, BASELINE_SCORE_CONFIG_V1, NOW)

    expect(ranked).toHaveLength(2)
    for (const listing of ranked) {
      expect(Number.isFinite(listing.score)).toBe(true)
    }
  })

  it('conserve une place pour les annonces nouvelles malgré un pool sans historique d’engagement', () => {
    const candidates = [
      buildCandidate({ listingId: 'new', createdAtMs: NOW - 1 * 24 * 60 * 60 * 1000, engagement: undefined }),
      buildCandidate({ listingId: 'established', createdAtMs: NOW - 90 * 24 * 60 * 60 * 1000, engagement: undefined }),
    ]

    const ranked = rankCandidates(candidates, buildContext(), BASELINE_SCORE_CONFIG_V1, NOW)

    expect(ranked.map((r) => r.listingId)).toContain('new')
  })
})
