import { NextResponse } from 'next/server';
import { getPublicReels } from '@/db/reel.db';
import { getCacheStore } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.reels.feed');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitPerPage = parseInt(url.searchParams.get('limitPerPage') ?? '10', 10);
  const cursor = url.searchParams.get('cursor') ?? null;
  const categoryRootName = url.searchParams.get('category')?.trim() || undefined;

  const cache = getCacheStore();
  const cacheKey = `reels:feed:${categoryRootName ?? 'all'}:${limitPerPage}:${cursor ?? 'first'}`;

  try {
    const cached = await cache.get<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        },
      });
    }

    const result = await getPublicReels({ limitPerPage, cursor, categoryRootName });

    await cache.set(cacheKey, result, CACHE_TTL_SECONDS);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/reels/feed',
      fallbackMessage: 'Failed to fetch reels',
    });
  }
}
