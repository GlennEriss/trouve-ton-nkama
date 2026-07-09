import { NextResponse } from 'next/server';
import { getServerCountByProvince } from '@/db/property.db';
import { getCacheStore } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.property.count.by-province');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const province = url.searchParams.get('province');

  if (!province) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Province is required', { field: 'province' });
  }

  const cache = getCacheStore();
  const cacheKey = `propertyCountByProvince:${province}`;

  try {
    const cached = await cache.get<number>(cacheKey);
    if (typeof cached === 'number') {
      return NextResponse.json(
        { count: cached },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
          },
        }
      );
    }

    const count = await getServerCountByProvince(province);

    await cache.set(cacheKey, count, CACHE_TTL_SECONDS);

    return NextResponse.json(
      { count },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
        },
      }
    );
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/property/count/by-province',
      fallbackMessage: 'Failed to fetch count',
    });
  }
}
