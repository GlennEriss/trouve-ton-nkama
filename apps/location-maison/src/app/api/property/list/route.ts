import { NextResponse } from 'next/server';
import { getProperties } from '@/db/property.db';
import { getCacheStore } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.property.list');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get('limitPerPage') ?? url.searchParams.get('limit') ?? 10);
  const limitPerPage = Number.isInteger(requestedLimit)
    ? Math.min(50, Math.max(1, requestedLimit))
    : 10;
  const rawLastDoc = url.searchParams.get('lastDoc')?.trim() ?? '';
  const lastDoc = rawLastDoc && rawLastDoc.length <= 256 && !rawLastDoc.includes('/')
    ? rawLastDoc
    : null;

  const cache = getCacheStore();
  const cacheKey = `properties:list:${limitPerPage}:${lastDoc ?? 'first'}`;

  try {
    const cached = await cache.get<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        },
      });
    }

    const properties = await getProperties({ limitPerPage, lastDoc });

    await cache.set(cacheKey, properties, CACHE_TTL_SECONDS);

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
