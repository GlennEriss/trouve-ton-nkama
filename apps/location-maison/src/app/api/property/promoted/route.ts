import { NextResponse } from 'next/server';
import { getCacheStore } from '@/lib/cache';
import { Property } from '@/models/annonce';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';
import { serializePropertyPromotion } from '@/lib/serialize-property-promotion';
import { CACHE_KEY } from './constants';

const logger = createLogger('api.property.promoted');

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);

type PromotedResult = {
  featuredProperties: Property[];
  trendingProperties: Property[];
  boostProperties: Property[];
};

export async function GET() {
  const [{ adminApp }, { getFirestore }] = await Promise.all([
    import('@/firebase/admin'),
    import('firebase-admin/firestore'),
  ]);

  if (!adminApp) {
    return NextResponse.json({ error: 'Firebase admin is not initialized' }, { status: 500 });
  }

  const db = getFirestore(adminApp);
  const cache = getCacheStore();

  const cached = await cache.get<PromotedResult>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
      },
    });
  }

  try {
    const propertiesRef = db.collection('properties');
    const querySnap = await propertiesRef
      .where('isPromoted', '==', true)
      // Corrige une lacune préexistante : aucun filtre state/moderationStatus n'était
      // appliqué ici, une annonce archivée ou en attente de review pouvait apparaître
      // en avant sur l'accueil.
      .where('state', '==', 'IN_PROGRESS')
      .where('moderationStatus', '==', 'APPROVED')
      .orderBy('currentPromotion.startDate', 'desc')
      .limit(20)
      .get();

    const featured: Property[] = [];
    const trending: Property[] = [];
    const boost: Property[] = [];

    const now = new Date();

    querySnap.forEach((doc) => {
      const property = { ...doc.data(), id: doc.id } as Property;
      const promo: any = (property as any).currentPromotion;
      if (!promo) return;

      const type = promo.type as string;
      const isActive = promo.isActive;
      const endDate = promo.endDate ? new Date(promo.endDate.seconds * 1000) : null;

      const stillValid = type === 'boost' || (isActive && endDate && endDate > now);
      if (!stillValid) return;

      // Normalisation avant NextResponse.json — même bug que /api/announcer/ads corrigé
      // plus tôt (voir serialize-property-promotion.ts) : le SDK Admin sérialise ses
      // Timestamp avec un préfixe `_` (`_seconds`), pas encore consommé côté client ici
      // (aucun badge/countdown ne lit `currentPromotion` sur ces sections aujourd'hui),
      // mais latent pour la même raison — normalisé par précaution.
      const serializedProperty = serializePropertyPromotion(property);

      if (type === 'featured') featured.push(serializedProperty);
      else if (type === 'boost') boost.push(serializedProperty);
      else if (type === 'trending-7d' || type === 'trending-3d') trending.push(serializedProperty);
    });

    const result: PromotedResult = {
      featuredProperties: featured,
      trendingProperties: trending,
      boostProperties: boost,
    };

    await cache.set(CACHE_KEY, result, CACHE_TTL_SECONDS);

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
