import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors/app-error';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.geocode.reverse');

const geocodeCache = new Map<string, { data: any; expiry: number }>();
const CACHE_DURATION_MS = 1000 * 60 * 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function withCors(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return withCors(
      jsonApiError(400, 'VALIDATION_ERROR', 'Latitude and longitude are required', {
        missing: [!lat ? 'lat' : null, !lng ? 'lng' : null].filter(Boolean),
      })
    );
  }

  const cacheKey = `${lat},${lng}`;
  const cached = geocodeCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    const response = withCors(NextResponse.json(cached.data));
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600');
    return response;
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: {
        'User-Agent': 'LocationMaison/1.0',
      },
    });

    if (!response.ok) {
      throw new AppError(`Nominatim API error (${response.status})`, {
        code: 'NOMINATIM_UPSTREAM_ERROR',
        status: 502,
        details: { status: response.status },
      });
    }

    const data = await response.json();
    geocodeCache.set(cacheKey, { data, expiry: now + CACHE_DURATION_MS });

    const json = withCors(NextResponse.json(data));
    json.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600');
    return json;
  } catch (error) {
    return withCors(
      handleApiError(error, {
        logger,
        route: '/api/geocode',
        fallbackMessage: 'Failed to fetch data from Nominatim API',
      })
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
