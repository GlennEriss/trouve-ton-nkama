import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import { createLogger } from '@/lib/logger'
import { forwardToRecommendationAnalytics } from '@/lib/server/recommendation-analytics-forwarder'
import { resolveRecommendationActor } from '@/lib/server/recommendation-actor'
import { resolveBaselineTrafficPercent, resolveRankingVariant } from '@/lib/server/recommendation-ranking'
import { storeServedCandidates } from '@/lib/server/recommendation-cache'
import { rankCandidates } from '@/features/recommendation/scoring/rank'
import { BASELINE_SCORE_CONFIG_V1 } from '@/features/recommendation/scoring/score-config'
import type { ScoringCandidate, ScoringContext } from '@/features/recommendation/scoring/types'

const logger = createLogger('api.recommendations.requests')

// Phase 2 : le classement pondéré n'est actif que pour la variante "baseline" (voir
// resolveRankingVariant) — la variante "control" garde le comportement Phase 1 (ordre Algolia
// inchangé). ranking_version distingue les deux sans ambiguïté dans les données journalisées.
const CONTROL_RANKING_VERSION = 'pre-baseline-v0'

const candidateSchema = z.object({
  listingId: z.string().trim().min(1).max(256),
  position: z.number().int().min(0).max(500),
  // Champs de scoring (Phase 2) : optionnels côté schéma pour rester tolérant à un appelant qui
  // n'en envoie pas encore — dans ce cas les valeurs par défaut ci-dessous s'appliquent, jamais
  // une erreur bloquante.
  categoryLvl0: z.string().trim().max(64).optional(),
  city: z.string().trim().max(120).optional(),
  province: z.string().trim().max(120).optional(),
  price: z.number().min(0).optional(),
  area: z.number().min(0).optional(),
  createdAtMs: z.number().optional(),
  state: z.enum(['IN_PROGRESS', 'ARCHIVED']).optional(),
  moderationStatus: z.string().trim().max(64).optional(),
  isPromoted: z.boolean().optional(),
  imageCount: z.number().int().min(0).optional(),
  advertiserId: z.string().trim().max(256).optional(),
})

const scoringContextSchema = z
  .object({
    categoryLvl0: z.string().trim().max(64).optional(),
    city: z.string().trim().max(120).optional(),
    budgetMin: z.number().min(0).optional(),
    budgetMax: z.number().min(0).optional(),
  })
  .strict()

const bodySchema = z
  .object({
    context: z.enum(['home', 'search', 'similar', 'reel']),
    candidates: z.array(candidateSchema).min(1).max(50),
    scoringContext: scoringContextSchema.optional(),
    filters: z.record(z.string(), z.unknown()).optional(),
    visitorId: z.string().trim().max(256).optional(),
    sessionId: z.string().trim().min(1).max(256).optional(),
  })
  .strict()

function toScoringCandidateFromWire(candidate: z.infer<typeof candidateSchema>): ScoringCandidate {
  return {
    listingId: candidate.listingId,
    categoryLvl0: candidate.categoryLvl0,
    city: candidate.city,
    province: candidate.province,
    price: candidate.price,
    area: candidate.area,
    createdAtMs: candidate.createdAtMs,
    state: candidate.state ?? 'IN_PROGRESS',
    moderationStatus: candidate.moderationStatus ?? 'PENDING',
    isPromoted: candidate.isPromoted,
    imageCount: candidate.imageCount ?? 0,
    advertiserId: candidate.advertiserId,
  }
}

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

    const { context, candidates, scoringContext, filters, visitorId, sessionId } = parsed.data
    const actorId = resolveRecommendationActor(request, visitorId)
    const recommendationRequestId = randomUUID()
    const occurredAt = new Date().toISOString()

    const trafficPercent = resolveBaselineTrafficPercent()
    const rankingVariant = resolveRankingVariant(actorId, trafficPercent, BASELINE_SCORE_CONFIG_V1.version)
    const rankingVersion = rankingVariant === 'baseline' ? BASELINE_SCORE_CONFIG_V1.version : CONTROL_RANKING_VERSION

    let orderedListingIds: string[] | null = null
    if (rankingVariant === 'baseline') {
      try {
        const scoringCandidates = candidates.map(toScoringCandidateFromWire)
        const rankingContext: ScoringContext = {
          categoryLvl0: scoringContext?.categoryLvl0,
          city: scoringContext?.city,
          budgetMin: scoringContext?.budgetMin,
          budgetMax: scoringContext?.budgetMax,
        }
        const ranked = rankCandidates(scoringCandidates, rankingContext, BASELINE_SCORE_CONFIG_V1, Date.now())
        orderedListingIds = ranked.map((listing) => listing.listingId)
      } catch (error) {
        // Fallback déterministe : jamais d'échec bloquant, on repart avec orderedListingIds=null
        // (le client garde l'ordre Algolia) — voir ARCHITECTURE-OVERVIEW.md.
        logger.warn('Baseline ranking failed; falling back to Algolia order', { error })
        orderedListingIds = null
      }
    }

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
        ranking_variant: rankingVariant,
        ranking_version: rankingVersion,
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
      rankingVariant,
      rankingVersion,
      orderedListingIds,
    })
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/recommendations/requests',
      fallbackMessage: 'Internal server error',
    })
  }
}
