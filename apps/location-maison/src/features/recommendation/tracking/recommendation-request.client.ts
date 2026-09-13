'use client'

import { createLogger } from '@/lib/logger'
import { getOrCreateStatisticsVisitorId } from '@/lib/statistics/statistics-visitor.client'

const logger = createLogger('recommendation.request-client')
const REQUESTS_ENDPOINT = '/api/recommendations/requests'

export type RecommendationContext = 'home' | 'search' | 'similar' | 'reel'

export type RegisteredRecommendationRequest = {
  recommendationRequestId: string
  rankingVariant: string
  rankingVersion: string
}

// Appelé juste après réception des résultats Algolia (l'ordre n'est pas modifié à ce stade —
// Phase 1 = collecte seule, voir docs/recommendation-ml/IMPLEMENTATION-ET-TESTS.md). Enregistre
// la liste servie pour pouvoir corréler impressions/interactions à un recommendationRequestId.
export async function registerRecommendationRequest(input: {
  context: RecommendationContext
  candidates: Array<{ listingId: string; position: number }>
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
        visitorId: getOrCreateStatisticsVisitorId(),
      }),
      keepalive: true,
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
    }
  } catch (error) {
    // Ne bloque jamais l'affichage de la liste : l'échec de collecte n'est jamais une panne
    // fonctionnelle pour l'utilisateur.
    logger.warn('Recommendation request registration failed', { error })
    return null
  }
}
