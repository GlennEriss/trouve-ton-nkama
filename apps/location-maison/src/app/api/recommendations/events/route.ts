import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import { createLogger } from '@/lib/logger'
import { forwardToRecommendationAnalytics } from '@/lib/server/recommendation-analytics-forwarder'
import { resolveRecommendationActor } from '@/lib/server/recommendation-actor'
import { claimEventId, wasListingServed } from '@/lib/server/recommendation-cache'

const logger = createLogger('api.recommendations.events')

const RECOMMENDATION_EVENT_NAMES = [
  'recommendation_impression',
  'recommendation_click',
  'recommendation_detail_view',
  'recommendation_favorite_add',
  'recommendation_favorite_remove',
  'recommendation_contact_whatsapp',
  'recommendation_contact_phone',
  'recommendation_share',
  'recommendation_hide',
] as const

const eventSchema = z.object({
  eventId: z.string().trim().min(1).max(256),
  eventName: z.enum(RECOMMENDATION_EVENT_NAMES),
  recommendationRequestId: z.string().trim().min(1).max(256),
  listingId: z.string().trim().min(1).max(256),
  position: z.number().int().min(0).max(500).optional(),
  rankingVariant: z.string().trim().min(1).max(128),
  rankingVersion: z.string().trim().min(1).max(128),
  queryId: z.string().trim().max(128).optional(),
  deviceClass: z.enum(['mobile', 'desktop', 'tablet', 'unknown']).optional(),
  occurredAt: z.string().trim(),
})

const bodySchema = z
  .object({
    events: z.array(eventSchema).min(1).max(50),
    visitorId: z.string().trim().max(256).optional(),
    sessionId: z.string().trim().min(1).max(256).optional(),
  })
  .strict()

type RejectionReason = 'LISTING_NOT_IN_REQUEST' | 'DUPLICATE_EVENT_ID'

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

    const actorId = resolveRecommendationActor(request, parsed.data.visitorId)
    const accepted: (typeof parsed.data.events)[number][] = []
    const rejections: { eventId: string; reason: RejectionReason }[] = []

    for (const event of parsed.data.events) {
      // Ne bloque jamais la navigation : chaque event est traité indépendamment, un rejet
      // n'empêche pas le traitement des autres events du batch.
      const wasServed = await wasListingServed(event.recommendationRequestId, event.listingId)
      if (!wasServed) {
        rejections.push({ eventId: event.eventId, reason: 'LISTING_NOT_IN_REQUEST' })
        continue
      }

      const claimed = await claimEventId(event.eventId)
      if (!claimed) {
        rejections.push({ eventId: event.eventId, reason: 'DUPLICATE_EVENT_ID' })
        continue
      }

      accepted.push(event)
    }

    if (accepted.length > 0) {
      const correlationId = randomUUID()
      void forwardToRecommendationAnalytics(
        'events',
        {
          correlation_id: correlationId,
          actor: { actor_type: 'user', actor_id: actorId },
          session: parsed.data.sessionId ? { session_id: parsed.data.sessionId } : undefined,
          events: accepted.map((event) => ({
            event_id: event.eventId,
            event_name: event.eventName,
            occurred_at: event.occurredAt,
            recommendation_request_id: event.recommendationRequestId,
            listing_id: event.listingId,
            position: event.position,
            ranking_variant: event.rankingVariant,
            ranking_version: event.rankingVersion,
            query_id: event.queryId,
            device_class: event.deviceClass,
          })),
        },
        correlationId,
      ).catch((error) => logger.warn('Forward recommendation events failed', { error }))
    }

    return NextResponse.json({
      success: true,
      accepted: accepted.length,
      rejected: rejections.length,
      rejections,
    })
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/recommendations/events',
      fallbackMessage: 'Internal server error',
    })
  }
}
