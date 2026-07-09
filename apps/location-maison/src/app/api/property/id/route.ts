import { NextResponse } from 'next/server';
import { getPropertyById } from '@/db/property.db';
import { getCacheStore } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import type { Property } from '@/models/annonce';

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

  const cache = getCacheStore();
  const cacheKey = `property:${id}`;

  try {
    const cached = await cache.get<Property>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        },
      });
    }

    const property = await getPropertyById(id);

    // Traiter une annonce non approuvée ou archivée comme inexistante pour le public
    // (cette route est appelée sans auth, cf. PropertyCard.tsx / use-property.ts).
    if (!property || property.state !== 'IN_PROGRESS' || property.moderationStatus !== 'APPROVED') {
      return jsonApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found', { id });
    }

    // Awaited (pas fire-and-forget) : en environnement serverless (Vercel), une promesse
    // non attendue peut être annulée dès la réponse envoyée.
    await cache.set(cacheKey, property, CACHE_TTL_SECONDS);

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
