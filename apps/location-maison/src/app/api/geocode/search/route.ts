import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors/app-error';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.geocode.search');

const searchCache = new Map<string, { data: any; expiry: number }>();
const CACHE_DURATION_MS = 1000 * 60 * 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function withCors(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const countryCode = searchParams.get('countrycodes') ?? 'GA';

  if (!query) {
    return withCors(jsonApiError(400, 'VALIDATION_ERROR', 'Le terme de recherche est requis', { field: 'q' }));
  }

  const cacheKey = `${query}-${countryCode}`;
  const cached = searchCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    logger.debug('Serving geocode search from memory cache', { cacheKey });
    const response = withCors(NextResponse.json(cached.data));
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600');
    return response;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10&countrycodes=${countryCode}`,
      {
        headers: {
          'User-Agent': 'LocationMaison/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new AppError(`Nominatim search API error (${response.status})`, {
        code: 'NOMINATIM_SEARCH_UPSTREAM_ERROR',
        status: 502,
        details: { status: response.status },
      });
    }

    const data = await response.json();
    searchCache.set(cacheKey, { data, expiry: now + CACHE_DURATION_MS });

    const json = withCors(NextResponse.json(data));
    json.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600');
    return json;
  } catch (error) {
    return withCors(
      handleApiError(error, {
        logger,
        route: '/api/geocode/search',
        fallbackMessage: 'Erreur lors de la recherche',
      })
    );
  }
}

export async function OPTIONS() {
  return withCors(NextResponse.json({}));
}
