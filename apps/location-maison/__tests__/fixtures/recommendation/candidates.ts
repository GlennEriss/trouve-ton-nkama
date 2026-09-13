import { ScoringCandidate, ScoringContext } from '@/features/recommendation/scoring/types'

export function buildCandidate(overrides: Partial<ScoringCandidate> = {}): ScoringCandidate {
  return {
    listingId: 'listing-1',
    categoryLvl0: 'immobilier',
    city: 'Libreville',
    province: 'Estuaire',
    price: 150000,
    area: 80,
    createdAtMs: Date.parse('2026-08-01T00:00:00.000Z'),
    state: 'IN_PROGRESS',
    moderationStatus: 'APPROVED',
    isPromoted: false,
    imageCount: 4,
    advertiserId: 'advertiser-1',
    ...overrides,
  }
}

export function buildContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    categoryLvl0: 'immobilier',
    city: 'Libreville',
    budgetMin: 100000,
    budgetMax: 200000,
    ...overrides,
  }
}

export const NOW = Date.parse('2026-09-13T00:00:00.000Z')
