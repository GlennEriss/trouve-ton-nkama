import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import { incrementCampaignMetric } from '@/db/ad-campaign.db'

const logger = createLogger('api.advertising.track')

export async function POST(request: Request) {
  let payload: any
  try {
    payload = await request.json()
  } catch {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Corps JSON invalide')
  }

  const campaignId = typeof payload?.campaignId === 'string' ? payload.campaignId : ''
  const event = payload?.event === 'click' ? 'clicks' : payload?.event === 'impression' ? 'impressions' : null

  if (!campaignId || !event) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'campaignId et event (impression|click) requis')
  }

  try {
    const campaignExists = await incrementCampaignMetric(campaignId, event)
    if (!campaignExists) {
      return jsonApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campagne publicitaire introuvable')
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/advertising/track',
      fallbackMessage: 'Erreur lors du suivi publicitaire',
    })
  }
}
