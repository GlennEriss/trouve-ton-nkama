import { NextResponse } from 'next/server';
import { getPropertyById } from '@/db/property.db';
import redis from '@/redis/client';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.property.id');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_PROPERTY_TTL ?? '600', 10);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Property ID is required', {
      field: 'id',
    });
  }

  const cacheKey = `property:${id}`;

  try {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
          },
        });
      }
    } catch (error) {
      logger.warn('Redis GET failed for property', { id, error });
    }

    const property = await getPropertyById(id);

    if (!property) {
      return jsonApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found', { id });
    }

    try {
      await redis.set(cacheKey, property, { ex: CACHE_TTL_SECONDS });
    } catch (error) {
      logger.warn('Redis SET failed for property', { id, error });
    }

    return NextResponse.json(property, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/property/id',
      fallbackMessage: 'Failed to fetch property',
    });
  }
}
