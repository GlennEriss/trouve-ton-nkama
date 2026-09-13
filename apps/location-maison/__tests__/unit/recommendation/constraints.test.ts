import { filterEligibleCandidates, passesHardConstraints } from '@/features/recommendation/scoring/constraints'
import { buildCandidate, buildContext } from '../../fixtures/recommendation/candidates'

describe('passesHardConstraints', () => {
  it('accepte un candidat conforme', () => {
    expect(passesHardConstraints(buildCandidate(), buildContext())).toBe(true)
  })

  it('rejette une annonce archivée', () => {
    expect(passesHardConstraints(buildCandidate({ state: 'ARCHIVED' }), buildContext())).toBe(false)
  })

  it('rejette une annonce non approuvée en modération', () => {
    expect(passesHardConstraints(buildCandidate({ moderationStatus: 'PENDING' }), buildContext())).toBe(false)
  })

  it('rejette une catégorie différente du contexte', () => {
    const candidate = buildCandidate({ categoryLvl0: 'mode' })
    expect(passesHardConstraints(candidate, buildContext({ categoryLvl0: 'immobilier' }))).toBe(false)
  })

  it('rejette une zone différente du contexte', () => {
    const candidate = buildCandidate({ city: 'Port-Gentil' })
    expect(passesHardConstraints(candidate, buildContext({ city: 'Libreville' }))).toBe(false)
  })

  it('rejette un budget strictement hors bornes, même avec un score qui serait excellent par ailleurs', () => {
    const candidate = buildCandidate({ price: 10_000_000 })
    expect(passesHardConstraints(candidate, buildContext({ budgetMax: 200000 }))).toBe(false)
  })

  it('rejette une annonce explicitement exclue par l’utilisateur', () => {
    const candidate = buildCandidate({ listingId: 'listing-blocked' })
    expect(
      passesHardConstraints(candidate, buildContext({ excludedListingIds: ['listing-blocked'] })),
    ).toBe(false)
  })

  it('n’applique pas de contrainte de zone/catégorie quand le contexte ne les précise pas', () => {
    const candidate = buildCandidate({ categoryLvl0: undefined, city: undefined })
    expect(passesHardConstraints(candidate, buildContext({ categoryLvl0: undefined, city: undefined }))).toBe(true)
  })
})

describe('filterEligibleCandidates', () => {
  it('ne retourne jamais un candidat hors filtre, quel que soit le nombre de candidats', () => {
    const candidates = [
      buildCandidate({ listingId: 'ok-1' }),
      buildCandidate({ listingId: 'bad-category', categoryLvl0: 'mode' }),
      buildCandidate({ listingId: 'bad-city', city: 'Port-Gentil' }),
      buildCandidate({ listingId: 'bad-moderation', moderationStatus: 'REJECTED' }),
      buildCandidate({ listingId: 'ok-2' }),
    ]

    const result = filterEligibleCandidates(candidates, buildContext())

    expect(result.map((c) => c.listingId)).toEqual(['ok-1', 'ok-2'])
  })
})
