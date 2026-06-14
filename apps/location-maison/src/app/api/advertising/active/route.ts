import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import { getActiveCampaignForPlacement } from '@/db/ad-campaign.db'
import type { AdPlacement } from '@/models/advertising'

const logger = createLogger('api.advertising.active')

const VALID_PLACEMENTS: AdPlacement[] = [
  'search_infeed',
  'property_detail',
  'home',
  'immobilier_infeed',
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const placement = searchParams.get('placement') as AdPlacement | null

  if (!placement || !VALID_PLACEMENTS.includes(placement)) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Emplacement invalide', {
      field: 'placement',
    })
  }

  try {
    const creative = await getActiveCampaignForPlacement(placement, {
      province: searchParams.get('province'),
      city: searchParams.get('city'),
    })

    const res = NextResponse.json({ creative })
    // Cache court côté CDN : la pub maison change peu, on évite de marteler Firestore.
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return res
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/advertising/active',
      fallbackMessage: 'Erreur lors de la récupération de la publicité',
    })
  }
}
