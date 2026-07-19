import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import { incrementCampaignMetric } from '@/db/ad-campaign.db'
import { attachRequestId, createRequestLogContext } from '@/lib/observability/request-context'
import { resolveStatisticsActor } from '@/lib/server/statistics-actor'

export async function POST(request: Request) {
  const requestContext = createRequestLogContext(request, 'advertising.track', 'advertising')
  const logger = createLogger('api.advertising.track', requestContext)
  const respond = (response: Response): Response => attachRequestId(response, requestContext.requestId)
  let payload: any
  try {
    payload = await request.json()
  } catch {
    return respond(jsonApiError(400, 'VALIDATION_ERROR', 'Corps JSON invalide'))
  }

  const campaignId = typeof payload?.campaignId === 'string' ? payload.campaignId : ''
  const event = payload?.event === 'click' ? 'clicks' : payload?.event === 'impression' ? 'impressions' : null
  const placementKey = typeof payload?.placementKey === 'string'
    ? payload.placementKey.trim().slice(0, 128)
    : 'unknown'

  if (!campaignId || !event) {
    return respond(jsonApiError(400, 'VALIDATION_ERROR', 'campaignId et event (impression|click) requis'))
  }

  try {
    const actorId = resolveStatisticsActor(request, payload?.visitorId)
    const result = await incrementCampaignMetric(campaignId, event, actorId, placementKey)
    if (result === 'not-found') {
      return respond(jsonApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campagne publicitaire introuvable'))
    }
    return respond(NextResponse.json({ success: true, deduplicated: result === 'duplicate' }))
  } catch (error) {
    return respond(handleApiError(error, {
      logger,
      route: '/api/advertising/track',
      fallbackMessage: 'Erreur lors du suivi publicitaire',
    }))
  }
}
