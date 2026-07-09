import { NextResponse } from 'next/server'
import { getCacheStore } from '@/lib/cache'
import { createLogger } from '@/lib/logger'
import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import { googlePlaceDetails, ResolvedPlaceDTO } from '@/lib/places/google-places.server'

const logger = createLogger('api.places.details')

// Le placeId est stable : on cache les détails 30 jours (maximum autorisé).
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const placeId = searchParams.get('placeId')?.trim()
  const sessionToken = searchParams.get('sessionToken') ?? undefined

  if (!placeId) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Le placeId est requis', { field: 'placeId' })
  }

  const cache = getCacheStore()
  const cacheKey = `places:details:${placeId}`

  try {
    const cached = await cache.get<ResolvedPlaceDTO>(cacheKey)
    if (cached) {
      logger.debug('details cache HIT', { placeId })
      const res = NextResponse.json({ place: cached })
      res.headers.set('X-Cache', 'HIT')
      return res
    }

    const place = await googlePlaceDetails(placeId, sessionToken)
    if (place) {
      await cache.set(cacheKey, place, CACHE_TTL_SECONDS)
    }

    const res = NextResponse.json({ place })
    res.headers.set('X-Cache', 'MISS')
    return res
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/places/details',
      fallbackMessage: 'Erreur lors de la récupération du lieu',
    })
  }
}
