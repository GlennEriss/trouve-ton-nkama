import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import { createLogger } from '@/lib/logger'
import { forwardToRecommendationAnalytics } from '@/lib/server/recommendation-analytics-forwarder'
import { resolveRecommendationActor } from '@/lib/server/recommendation-actor'
import { storeServedCandidates } from '@/lib/server/recommendation-cache'

const logger = createLogger('api.recommendations.requests')

// Phase 1 (collecte) : aucune expérimentation active, le classement Algolia existant n'est pas
// modifié — voir docs/recommendation-ml/IMPLEMENTATION-ET-TESTS.md, Phase 1 vs Phase 2.
const RANKING_VARIANT = 'control'
const RANKING_VERSION = 'pre-baseline-v0'

const candidateSchema = z.object({
  listingId: z.string().trim().min(1).max(256),
  position: z.number().int().min(0).max(500),
})

const bodySchema = z
  .object({
    context: z.enum(['home', 'search', 'similar', 'reel']),
    candidates: z.array(candidateSchema).min(1).max(50),
    filters: z.record(z.string(), z.unknown()).optional(),
    visitorId: z.string().trim().max(256).optional(),
    sessionId: z.string().trim().min(1).max(256).optional(),
  })
  .strict()

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Corps de requête invalide.', {
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      })
    }

    const { context, candidates, filters, visitorId, sessionId } = parsed.data
    const actorId = resolveRecommendationActor(request, visitorId)
    const recommendationRequestId = randomUUID()
    const occurredAt = new Date().toISOString()

    // Critique pour la validation des events plus tard : doit être écrit avant de répondre.
    await storeServedCandidates(
      recommendationRequestId,
      candidates.map((candidate) => candidate.listingId),
    )

    // Non critique pour la réponse : transmission BigQuery en best-effort, ne bloque jamais le
    // rendu (NFR ARCHITECTURE-OVERVIEW.md).
    void forwardToRecommendationAnalytics(
      'requests',
      {
        occurred_at: occurredAt,
        actor: { actor_type: 'user', actor_id: actorId },
        session: sessionId ? { session_id: sessionId } : undefined,
        recommendation_request_id: recommendationRequestId,
        context,
        ranking_variant: RANKING_VARIANT,
        ranking_version: RANKING_VERSION,
        filters_json: filters,
        candidates: candidates.map((candidate) => ({
          listing_id: candidate.listingId,
          position: candidate.position,
        })),
      },
      recommendationRequestId,
    ).catch((error) => logger.warn('Forward request-served failed', { error }))

    return NextResponse.json({
      success: true,
      recommendationRequestId,
      rankingVariant: RANKING_VARIANT,
      rankingVersion: RANKING_VERSION,
    })
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/recommendations/requests',
      fallbackMessage: 'Internal server error',
    })
  }
}
