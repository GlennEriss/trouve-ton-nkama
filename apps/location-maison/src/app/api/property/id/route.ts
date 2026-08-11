import { NextResponse } from 'next/server';
import { getPropertyById } from '@/db/property.db';
import { getCacheStore } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { auth } from '@/next-auth/auth';
import type { Property } from '@/models/annonce';

const logger = createLogger('api.property.id');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_PROPERTY_TTL ?? '600', 10);

function isPubliclyVisible(property: Property): boolean {
  return property.state === 'IN_PROGRESS' && property.moderationStatus === 'APPROVED';
}

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

    // Route publique par défaut (cf. PropertyCard.tsx / use-property.ts, appelée
    // sans auth) : une annonce non approuvée/archivée est traitée comme
    // inexistante pour tout le monde...
    if (property && isPubliclyVisible(property)) {
      // Awaited (pas fire-and-forget) : en environnement serverless (Vercel), une promesse
      // non attendue peut être annulée dès la réponse envoyée.
      await cache.set(cacheKey, property, CACHE_TTL_SECONDS);

      return NextResponse.json(property, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        },
      });
    }

    // ...SAUF pour son propriétaire : la vue "gestion de mon annonce"
    // (/property/[id], PreviewPropertyClient.tsx) doit pouvoir afficher sa
    // propre annonce même en attente de modération/rejetée. Jamais mis dans
    // le cache public partagé ci-dessus (spécifique à cet utilisateur).
    const session = await auth().catch(() => null);
    if (property && session?.user?.uid && property.createdBy === session.user.uid) {
      return NextResponse.json(property, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    return jsonApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found', { id });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/property/id',
      fallbackMessage: 'Failed to fetch property',
    });
  }
}
