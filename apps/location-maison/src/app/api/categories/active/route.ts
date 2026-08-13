import { NextResponse } from 'next/server';
import { getCacheStore } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.categories.active');

const CACHE_KEY = 'categories:active-roots';
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);

type ActiveRootCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  order: number;
};

/**
 * Racines de catégories actives (ex. "Immobilier") pour le sélecteur de recherche
 * (Lot 4, voir docs/marketplace-multi-categories/03-page-recherche.md). Lecture via le
 * SDK Admin (pas le SDK client) pour ne pas dépendre d'une règle Firestore publique sur
 * `listing_categories` — cette collection n'a jamais été exposée côté client.
 */
export async function GET() {
  const cache = getCacheStore();

  try {
    const cached = await cache.get<ActiveRootCategory[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { categories: cached },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
      );
    }

    const [{ adminApp }, { getFirestore }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ]);

    if (!adminApp) {
      return NextResponse.json({ error: 'Firebase admin is not initialized' }, { status: 500 });
    }

    const db = getFirestore(adminApp);
    const snapshot = await db
      .collection('listing_categories')
      .where('parentId', '==', null)
      .where('isActive', '==', true)
      .get();

    const categories: ActiveRootCategory[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          slug: typeof data.slug === 'string' ? data.slug : doc.id,
          name: typeof data.name === 'string' ? data.name : doc.id,
          icon: typeof data.icon === 'string' ? data.icon : null,
          order: typeof data.order === 'number' ? data.order : 0,
        };
      })
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));

    await cache.set(CACHE_KEY, categories, CACHE_TTL_SECONDS);

    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/categories/active',
      fallbackMessage: 'Failed to fetch active categories',
    });
  }
}
