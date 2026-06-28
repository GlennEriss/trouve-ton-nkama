import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import {
  getActiveCampaignForPlacement,
  getActiveCampaignsForPlacement,
} from '@/db/ad-campaign.db'
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
    const ctx = {
      province: searchParams.get('province'),
      city: searchParams.get('city'),
    }
    const wantsAll = searchParams.get('all') === '1'

    if (wantsAll) {
      const creatives = await getActiveCampaignsForPlacement(placement, ctx)
      const res = NextResponse.json({ creative: creatives[0] ?? null, creatives })
      res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
      return res
    }

    const creative = await getActiveCampaignForPlacement(placement, ctx)

    const res = NextResponse.json({ creative })
    // Pas de cache ici : la rotation équitable utilise un compteur serveur à
    // chaque requête. Le mode `all=1` de la home peut rester cacheable.
    res.headers.set('Cache-Control', 'private, no-store, max-age=0')
    return res
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/advertising/active',
      fallbackMessage: 'Erreur lors de la récupération de la publicité',
    })
  }
}
