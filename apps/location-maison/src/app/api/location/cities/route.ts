import { NextResponse } from 'next/server';
import { collection, db, getDocs, query, where } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { getCacheStore } from '@/lib/cache';
import { City } from '@/models/city';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { isDisplayableLocationLabel } from '@/lib/location/label-guards';

const logger = createLogger('api.location.cities');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_LOCATION_TTL ?? '1800', 10);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provinceId = url.searchParams.get('provinceId');

  if (!provinceId) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Province ID is required', { field: 'provinceId' });
  }

  try {
    const cache = getCacheStore();
    const cacheKey = `cities:province:${provinceId}`;
    const cached = await cache.get<City[]>(cacheKey);

    if (Array.isArray(cached)) {
      return NextResponse.json(
        { cities: cached },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
          },
        }
      );
    }

    const citiesRef = collection(db, firebaseCollectionNames.cities);
    const q = query(citiesRef, where('provinceId', '==', provinceId));
    const querySnapshot = await getDocs(q);

    const cities: City[] = [];
    querySnapshot.forEach((doc) => {
      cities.push({
        id: doc.id,
        ...doc.data(),
      } as City);
    });

    const filteredCities = cities
      .filter((city) => isDisplayableLocationLabel(city.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    await cache.set(cacheKey, filteredCities, CACHE_TTL_SECONDS);

    return NextResponse.json(
      { cities: filteredCities },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
        },
      }
    );
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/location/cities',
      fallbackMessage: 'Failed to fetch cities',
    });
  }
}
