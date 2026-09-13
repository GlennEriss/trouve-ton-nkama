import { toRecommendationCandidate, toScoringCandidate } from '@/features/recommendation/scoring/candidate-mapper'

describe('toScoringCandidate', () => {
  it('mappe un hit Algolia complet', () => {
    const candidate = toScoringCandidate({
      objectID: 'listing-1',
      categoryPath: { lvl0: 'mode', lvl1: 'vetements' },
      city: 'Libreville',
      province: 'Estuaire',
      price: 15000,
      area: 0,
      createdAt: 1_757_000_000_000,
      state: 'IN_PROGRESS',
      moderationStatus: 'APPROVED',
      isPromoted: true,
      images: [{ fileURL: 'a' }, { fileURL: 'b' }],
      createdBy: 'owner-1',
    })

    expect(candidate).toEqual({
      listingId: 'listing-1',
      categoryLvl0: 'mode',
      city: 'Libreville',
      province: 'Estuaire',
      price: 15000,
      area: 0,
      createdAtMs: 1_757_000_000_000,
      state: 'IN_PROGRESS',
      moderationStatus: 'APPROVED',
      isPromoted: true,
      imageCount: 2,
      advertiserId: 'owner-1',
    })
  })

  it("replie sur categoryLvl0='Immobilier' quand categoryPath est absent (annonce pre-backfill)", () => {
    const candidate = toScoringCandidate({ objectID: 'listing-2' })
    expect(candidate.categoryLvl0).toBe('Immobilier')
  })

  it('replie sur state=IN_PROGRESS pour toute valeur autre que ARCHIVED', () => {
    expect(toScoringCandidate({ objectID: 'l', state: undefined }).state).toBe('IN_PROGRESS')
    expect(toScoringCandidate({ objectID: 'l', state: 'ARCHIVED' }).state).toBe('ARCHIVED')
    expect(toScoringCandidate({ objectID: 'l', state: 'something-unexpected' }).state).toBe('IN_PROGRESS')
  })

  it('replie sur moderationStatus=PENDING quand absent', () => {
    expect(toScoringCandidate({ objectID: 'l' }).moderationStatus).toBe('PENDING')
  })

  it('accepte createdAt en chaîne ISO et le convertit en millisecondes', () => {
    const candidate = toScoringCandidate({ objectID: 'l', createdAt: '2026-09-01T00:00:00.000Z' })
    expect(candidate.createdAtMs).toBe(Date.parse('2026-09-01T00:00:00.000Z'))
  })

  it('renvoie createdAtMs undefined pour une valeur non exploitable', () => {
    expect(toScoringCandidate({ objectID: 'l', createdAt: 'pas-une-date' }).createdAtMs).toBeUndefined()
  })

  it('accepte un Timestamp Firestore {seconds, nanoseconds} (propriétés lues hors Algolia)', () => {
    const candidate = toScoringCandidate({ objectID: 'l', createdAt: { seconds: 1_757_000_000, nanoseconds: 500_000_000 } })
    expect(candidate.createdAtMs).toBe(1_757_000_000_000 + 500)
  })

  it('compte 0 image quand images est absent ou non-tableau', () => {
    expect(toScoringCandidate({ objectID: 'l' }).imageCount).toBe(0)
    expect(toScoringCandidate({ objectID: 'l', images: undefined }).imageCount).toBe(0)
  })
})

describe('toRecommendationCandidate', () => {
  it('ajoute la position au mapping de scoring', () => {
    const candidate = toRecommendationCandidate({ objectID: 'listing-1', city: 'Libreville' }, 3)
    expect(candidate).toEqual(expect.objectContaining({ listingId: 'listing-1', city: 'Libreville', position: 3 }))
  })
})
