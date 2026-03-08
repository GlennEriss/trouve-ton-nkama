import { NextResponse } from 'next/server';
import { collection, db, getDocs, query, where } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import redis from '@/redis/client';
import { Street } from '@/models/street';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.location.streets');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_LOCATION_TTL ?? '1800', 10);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cityId = url.searchParams.get('cityId');

  if (!cityId) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'City ID is required', { field: 'cityId' });
  }

  try {
    const cacheKey = `streets:city:${cityId}`;
    const cached = await redis.get<Street[]>(cacheKey);

    if (Array.isArray(cached)) {
      return NextResponse.json(
        { streets: cached },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
          },
        }
      );
    }

    const streetsRef = collection(db, firebaseCollectionNames.streets);
    const q = query(streetsRef, where('cityId', '==', cityId));
    const querySnapshot = await getDocs(q);

    const streets: Street[] = [];
    querySnapshot.forEach((doc) => {
      streets.push({
        id: doc.id,
        ...doc.data(),
      } as Street);
    });

    streets.sort((a, b) => a.name.localeCompare(b.name));

    try {
      await redis.set(cacheKey, streets, { ex: CACHE_TTL_SECONDS });
    } catch (error) {
      logger.warn('Failed to cache streets list', { cityId, error });
    }

    return NextResponse.json(
      { streets },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
        },
      }
    );
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/location/streets',
      fallbackMessage: 'Failed to fetch streets',
    });
  }
}
