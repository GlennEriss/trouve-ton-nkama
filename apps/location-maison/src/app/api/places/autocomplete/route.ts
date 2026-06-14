import { NextResponse } from 'next/server'
import redis from '@/redis/client'
import { createLogger } from '@/lib/logger'
import { handleApiError, jsonApiError } from '@/lib/api/error-response'
import { googleAutocomplete, PlaceSuggestionDTO } from '@/lib/places/google-places.server'

const logger = createLogger('api.places.autocomplete')

// Cache partagé des suggestions (les prédictions peuvent évoluer → 7 jours,
// dans la limite des 30 jours autorisés par Google).
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7

function biasKey(bias?: { lat: number; lng: number } | null): string {
  if (!bias) return 'none'
  return `${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}`
}

async function safeCacheGet(key: string): Promise<PlaceSuggestionDTO[] | null> {
  try {
    return await redis.get<PlaceSuggestionDTO[]>(key)
  } catch (error) {
    logger.warn('Redis indisponible (get) — fallback Google direct', { error })
    return null
  }
}

async function safeCacheSet(key: string, items: PlaceSuggestionDTO[]): Promise<void> {
  try {
    await redis.set(key, items, { ex: CACHE_TTL_SECONDS })
  } catch (error) {
    logger.warn('Redis indisponible (set) — résultat non mis en cache', { error })
  }
}

export async function POST(request: Request) {
  let payload: any
  try {
    payload = await request.json()
  } catch {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Corps de requête JSON invalide')
  }

  const input = typeof payload?.input === 'string' ? payload.input.trim() : ''
  const bias =
    payload?.bias && typeof payload.bias.lat === 'number' && typeof payload.bias.lng === 'number'
      ? { lat: payload.bias.lat as number, lng: payload.bias.lng as number }
      : null
  const sessionToken = typeof payload?.sessionToken === 'string' ? payload.sessionToken : undefined

  if (input.length < 2) {
    return NextResponse.json({ items: [] })
  }

  const cacheKey = `places:ac:${input.toLowerCase()}:${biasKey(bias)}`

  try {
    // Cache best-effort : une panne Redis ne doit pas casser la recherche.
    const cached = await safeCacheGet(cacheKey)
    if (cached) {
      logger.debug('autocomplete cache HIT', { cacheKey })
      const res = NextResponse.json({ items: cached })
      res.headers.set('X-Cache', 'HIT')
      return res
    }

    const items = await googleAutocomplete({ input, bias, sessionToken })
    // On ne met en cache que des résultats exploitables.
    if (items.length > 0) {
      await safeCacheSet(cacheKey, items)
    }

    const res = NextResponse.json({ items })
    res.headers.set('X-Cache', 'MISS')
    return res
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/places/autocomplete',
      fallbackMessage: 'Erreur lors de la recherche de lieux',
    })
  }
}
