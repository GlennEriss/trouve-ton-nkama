/**
 * @module recommendation/scoring/types
 */

export type ListingState = 'ARCHIVED' | 'IN_PROGRESS'

export interface ScoringCandidate {
  listingId: string
  categoryLvl0?: string
  city?: string
  province?: string
  price?: number
  area?: number
  createdAtMs?: number
  state: ListingState
  moderationStatus: string
  isPromoted?: boolean
  imageCount: number
  advertiserId?: string
  engagement?: {
    impressions: number
    interactions: number
  }
}

export interface ScoringProfile {
  hasHistory: boolean
  recentCategories?: string[]
  recentCities?: string[]
}

export interface ScoringContext {
  categoryLvl0?: string
  city?: string
  province?: string
  budgetMin?: number
  budgetMax?: number
  profile?: ScoringProfile
  excludedListingIds?: string[]
}

export interface ScoreComponentBreakdown {
  relevance: number
  budgetProximity: number
  geoMatch: number
  recency: number
  quality: number
  engagement: number
  exploration: number
}

export interface ScoreResult {
  listingId: string
  score: number
  breakdown: ScoreComponentBreakdown
  configVersion: string
}

export interface ScoreWeights {
  relevance: number
  budgetProximity: number
  geoMatch: number
  recency: number
  quality: number
  engagement: number
  exploration: number
}

export interface ScoreConfig {
  version: string
  weights: ScoreWeights
  recencyHalfLifeDays: number
  newListingMaxAgeDays: number
  minImpressionsForEngagement: number
}
