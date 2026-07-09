import { NextResponse } from 'next/server';
import { getCacheStore } from '@/lib/cache';
import { getServerCountByPropertyType, getServerCountByProvince } from '@/db/property.db';
import { HOME_PROPERTY_TYPE_KEYS, HOME_PROVINCE_NAMES } from '@/constantes/home-page';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.property.count.summary');

const CACHE_KEY = 'propertyCount:summary:v1';
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);

type PropertyCountSummary = {
  byType: Record<string, number>;
  byProvince: Record<string, number>;
  generatedAt: string;
};

function isValidSummary(value: unknown): value is PropertyCountSummary {
  if (!value || typeof value !== 'object') return false;
  const payload = value as PropertyCountSummary;

  return (
    typeof payload.generatedAt === 'string' &&
    !!payload.byType &&
    typeof payload.byType === 'object' &&
    !!payload.byProvince &&
    typeof payload.byProvince === 'object'
  );
}

function withCacheHeaders(payload: PropertyCountSummary) {
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
    },
  });
}

async function buildSummary(): Promise<PropertyCountSummary> {
  const [typeEntries, provinceEntries] = await Promise.all([
    Promise.all(
      HOME_PROPERTY_TYPE_KEYS.map(async (type) => {
        const count = await getServerCountByPropertyType(type);
        return [type, count] as const;
      })
    ),
    Promise.all(
      HOME_PROVINCE_NAMES.map(async (province) => {
        const count = await getServerCountByProvince(province);
        return [province, count] as const;
      })
    ),
  ]);

  return {
    byType: Object.fromEntries(typeEntries),
    byProvince: Object.fromEntries(provinceEntries),
    generatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const cache = getCacheStore();
  let cachedSummary: PropertyCountSummary | null = null;

  try {
    const cached = await cache.get<unknown>(CACHE_KEY);
    if (isValidSummary(cached)) {
      cachedSummary = cached;
      return withCacheHeaders(cached);
    }

    const summary = await buildSummary();

    await cache.set(CACHE_KEY, summary, CACHE_TTL_SECONDS);

    return withCacheHeaders(summary);
  } catch (error) {
    logger.error('Failed to build property count summary', { error });

    if (cachedSummary) {
      return withCacheHeaders(cachedSummary);
    }

    return handleApiError(error, {
      logger,
      route: '/api/property/count/summary',
      fallbackMessage: 'Failed to fetch property count summary',
    });
  }
}

export async function DELETE() {
  try {
    await getCacheStore().del(CACHE_KEY);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/property/count/summary',
      fallbackMessage: 'Failed to invalidate property count summary cache',
    });
  }
}
