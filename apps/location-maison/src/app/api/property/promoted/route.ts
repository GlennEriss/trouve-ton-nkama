import { NextResponse } from 'next/server';
import redis from '@/redis/client';
import { Property } from '@/models/annonce';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.property.promoted');

const CACHE_KEY = 'properties:promoted';
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);

export async function GET() {
  const [{ adminApp }, { getFirestore }] = await Promise.all([
    import('@/firebase/admin'),
    import('firebase-admin/firestore'),
  ]);

  if (!adminApp) {
    return NextResponse.json({ error: 'Firebase admin is not initialized' }, { status: 500 });
  }

  const db = getFirestore(adminApp);

  try {
    const cached = await redis.get<any>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        },
      });
    }
  } catch (error) {
    logger.warn('Redis GET failed for promoted properties', { error });
  }

  try {
    const propertiesRef = db.collection('properties');
    const querySnap = await propertiesRef
      .where('isPromoted', '==', true)
      .orderBy('currentPromotion.startDate', 'desc')
      .limit(20)
      .get();

    const featured: Property[] = [];
    const trending: Property[] = [];
    const boost: Property[] = [];

    const now = new Date();

    querySnap.forEach((doc) => {
      const property = { id: doc.id, ...doc.data() } as Property;
      const promo: any = (property as any).currentPromotion;
      if (!promo) return;

      const type = promo.type as string;
      const isActive = promo.isActive;
      const endDate = promo.endDate ? new Date(promo.endDate.seconds * 1000) : null;

      const stillValid = type === 'boost' || (isActive && endDate && endDate > now);
      if (!stillValid) return;

      if (type === 'featured') featured.push(property);
      else if (type === 'boost') boost.push(property);
      else if (type === 'trending-7d' || type === 'trending-3d') trending.push(property);
    });

    const result = {
      featuredProperties: featured,
      trendingProperties: trending,
      boostProperties: boost,
    };

    try {
      await redis.set(CACHE_KEY, result, { ex: CACHE_TTL_SECONDS });
    } catch (error) {
      logger.warn('Redis SET failed for promoted properties', { error });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/property/promoted',
      fallbackMessage: 'Failed to fetch promoted properties',
    });
  }
}
