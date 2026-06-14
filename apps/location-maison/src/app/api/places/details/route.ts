import { NextResponse } from 'next/server'
import redis from '@/redis/client'
import { createLogger } from '@/lib/logger'
import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import { googlePlaceDetails, ResolvedPlaceDTO } from '@/lib/places/google-places.server'

const logger = createLogger('api.places.details')

// Le placeId est stable : on cache les détails 30 jours (maximum autorisé).
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30

async function safeCacheGet(key: string): Promise<ResolvedPlaceDTO | null> {
  try {
    return await redis.get<ResolvedPlaceDTO>(key)
  } catch (error) {
    logger.warn('Redis indisponible (get) — fallback Google direct', { error })
    return null
  }
}

async function safeCacheSet(key: string, place: ResolvedPlaceDTO): Promise<void> {
  try {
    await redis.set(key, place, { ex: CACHE_TTL_SECONDS })
  } catch (error) {
    logger.warn('Redis indisponible (set) — résultat non mis en cache', { error })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const placeId = searchParams.get('placeId')?.trim()
  const sessionToken = searchParams.get('sessionToken') ?? undefined

  if (!placeId) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Le placeId est requis', { field: 'placeId' })
  }

  const cacheKey = `places:details:${placeId}`

  try {
    const cached = await safeCacheGet(cacheKey)
    if (cached) {
      logger.debug('details cache HIT', { placeId })
      const res = NextResponse.json({ place: cached })
      res.headers.set('X-Cache', 'HIT')
      return res
    }

    const place = await googlePlaceDetails(placeId, sessionToken)
    if (place) {
      await safeCacheSet(cacheKey, place)
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
