'use client'

import { createLogger } from '@/lib/logger'
import { getOrCreateStatisticsVisitorId } from '@/lib/statistics/statistics-visitor.client'

const logger = createLogger('recommendation.request-client')
const REQUESTS_ENDPOINT = '/api/recommendations/requests'

export type RecommendationContext = 'home' | 'search' | 'similar' | 'reel'

export type RecommendationScoringCandidate = {
  listingId: string
  position: number
  categoryLvl0?: string
  city?: string
  province?: string
  price?: number
  area?: number
  createdAtMs?: number
  state?: 'IN_PROGRESS' | 'ARCHIVED'
  moderationStatus?: string
  isPromoted?: boolean
  imageCount?: number
  advertiserId?: string
}

export type RecommendationScoringContext = {
  categoryLvl0?: string
  city?: string
  budgetMin?: number
  budgetMax?: number
}

export type RegisteredRecommendationRequest = {
  recommendationRequestId: string
  rankingVariant: string
  rankingVersion: string
  orderedListingIds: string[] | null
}

// Appelé juste après réception des résultats Algolia. Enregistre la liste servie et, pour la
// variante "baseline" (Phase 2), reçoit un ordre reclassé — l'ordre Algolia lui-même n'est jamais
// modifié côté recherche, seul l'ordre d'affichage change. Voir
// docs/recommendation-ml/IMPLEMENTATION-ET-TESTS.md.
export async function registerRecommendationRequest(input: {
  context: RecommendationContext
  candidates: RecommendationScoringCandidate[]
  scoringContext?: RecommendationScoringContext
  signal?: AbortSignal
}): Promise<RegisteredRecommendationRequest | null> {
  if (input.candidates.length === 0) {
    return null
  }

  try {
    const response = await fetch(REQUESTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: input.context,
        candidates: input.candidates,
        scoringContext: input.scoringContext,
        visitorId: getOrCreateStatisticsVisitorId(),
      }),
      keepalive: true,
      signal: input.signal,
    })

    if (!response.ok) {
      logger.warn('Recommendation request registration rejected', { status: response.status })
      return null
    }

    const payload = await response.json()
    if (!payload?.success || typeof payload.recommendationRequestId !== 'string') {
      return null
    }

    return {
      recommendationRequestId: payload.recommendationRequestId,
      rankingVariant: payload.rankingVariant,
      rankingVersion: payload.rankingVersion,
      orderedListingIds: Array.isArray(payload.orderedListingIds) ? payload.orderedListingIds : null,
    }
  } catch (error) {
    // Ne bloque jamais l'affichage de la liste : l'échec de collecte n'est jamais une panne
    // fonctionnelle pour l'utilisateur. Inclut l'abandon volontaire par timeout (AbortError).
    logger.warn('Recommendation request registration failed', { error })
    return null
  }
}
