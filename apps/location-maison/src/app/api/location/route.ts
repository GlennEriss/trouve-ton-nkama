import { NextResponse, NextRequest } from 'next/server';
import { getSuggestions } from '@/db/suggestion.db';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.location.suggestions-legacy');

const locationCache = new Map<string, { data: any; expiry: number }>();
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 1000 * 60 * 10;

export async function GET(request: NextRequest) {
  void request;

  const now = Date.now();
  const cachedSuggestions = locationCache.get('suggestions');
  const isCacheValid = now - cacheTimestamp < CACHE_DURATION_MS;

  if (isCacheValid && cachedSuggestions && cachedSuggestions.expiry > now) {
    return NextResponse.json(cachedSuggestions.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
      },
    });
  }

  try {
    const suggestions = await getSuggestions();
    locationCache.set('suggestions', {
      data: suggestions,
      expiry: now + CACHE_DURATION_MS,
    });
    cacheTimestamp = now;

    return NextResponse.json(suggestions, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/location',
      fallbackMessage: 'Failed to fetch suggestions',
    });
  }
}
