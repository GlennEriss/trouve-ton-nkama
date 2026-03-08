import { NextResponse } from 'next/server';
import { getServerCountByProvince } from '@/db/property.db';
import redis from '@/redis/client';
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

  const cacheKey = `propertyCountByProvince:${province}`;

  try {
    try {
      const cached = await redis.get<number>(cacheKey);
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
    } catch (error) {
      logger.warn('Redis GET failed for property count by province', { province, error });
    }

    const count = await getServerCountByProvince(province);

    try {
      await redis.set(cacheKey, count, { ex: CACHE_TTL_SECONDS });
    } catch (error) {
      logger.warn('Redis SET failed for property count by province', { province, error });
    }

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
