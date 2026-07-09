import { NextResponse } from 'next/server';
import { collection, db, getDocs } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { getCacheStore } from '@/lib/cache';
import { Province } from '@/models/province';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.location.provinces');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_LOCATION_TTL ?? '1800', 10);

export async function GET() {
  try {
    const cache = getCacheStore();
    const cacheKey = 'provinces:all';
    const cached = await cache.get<Province[]>(cacheKey);

    if (Array.isArray(cached)) {
      return NextResponse.json(
        { provinces: cached },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
          },
        }
      );
    }

    const provincesRef = collection(db, firebaseCollectionNames.provinces);
    const querySnapshot = await getDocs(provincesRef);

    const provinces: Province[] = [];
    querySnapshot.forEach((doc) => {
      provinces.push({
        id: doc.id,
        ...doc.data(),
      } as Province);
    });

    provinces.sort((a, b) => a.name.localeCompare(b.name));

    await cache.set(cacheKey, provinces, CACHE_TTL_SECONDS);

    return NextResponse.json(
      { provinces },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
        },
      }
    );
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/location/provinces',
      fallbackMessage: 'Failed to fetch provinces',
    });
  }
}
