import { NextResponse } from 'next/server';
import { getProperties } from '@/db/property.db';
import redis from '@/redis/client';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.property.list');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitPerPage = parseInt(url.searchParams.get('limitPerPage') ?? '10', 10);
  const lastDoc = url.searchParams.get('lastDoc') ?? null;

  const cacheKey = `properties:list:${limitPerPage}:${lastDoc ?? 'first'}`;

  try {
    try {
      const cached = await redis.get<any>(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
          },
        });
      }
    } catch (error) {
      logger.warn('Redis GET failed for properties list', { cacheKey, error });
    }

    const properties = await getProperties({ limitPerPage, lastDoc });

    try {
      await redis.set(cacheKey, properties, { ex: CACHE_TTL_SECONDS });
    } catch (error) {
      logger.warn('Redis SET failed for properties list', { cacheKey, error });
    }

    return NextResponse.json(properties, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/property/list',
      fallbackMessage: 'Failed to fetch properties',
    });
  }
}
