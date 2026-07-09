import { NextResponse } from 'next/server';
import { collection, db, getDocs, query, where } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { getCacheStore } from '@/lib/cache';
import { Street } from '@/models/street';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { isDisplayableLocationLabel } from '@/lib/location/label-guards';

const logger = createLogger('api.location.streets');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_LOCATION_TTL ?? '1800', 10);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cityId = url.searchParams.get('cityId');

  if (!cityId) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'City ID is required', { field: 'cityId' });
  }

  try {
    const cache = getCacheStore();
    const cacheKey = `streets:city:${cityId}`;
    const cached = await cache.get<Street[]>(cacheKey);

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

    const filteredStreets = streets
      .filter((street) => isDisplayableLocationLabel(street.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    await cache.set(cacheKey, filteredStreets, CACHE_TTL_SECONDS);

    return NextResponse.json(
      { streets: filteredStreets },
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
