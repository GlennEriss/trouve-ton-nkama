import { NextResponse } from 'next/server';
import { getCacheStore } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';
import type { Property } from '@/models/annonce';

const logger = createLogger('api.categories.home-sections');

const CACHE_KEY = 'categories:home-sections';
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);
const SAMPLE_SIZE = 10;

type HomeSection = {
  id: string;
  slug: string;
  name: string;
  density: 'showcase' | 'standard' | 'compact';
  items: Property[];
};

/**
 * Sections d'accueil par catégorie (Lot 5, voir docs/marketplace-multi-categories/
 * 02-page-accueil.md). Inclut désormais "immobilier" (revu le 2026-08-15, demande
 * utilisateur explicite) : bien que redondant avec Tendances/Récentes/Par province, un rail
 * "Immobilier" donne à la home la même lisibilité par catégorie que "Mode", plutôt que des
 * sections immobilier non étiquetées suivies d'un rail Mode étiqueté. `minListingsForHomeSection`
 * d'immobilier est seedé à 0 : son rail apparaît donc toujours dès qu'il y a au moins une
 * annonce APPROVED, sans "catégorie vide" possible.
 *
 * Une catégorie n'apparaît que si son nombre d'annonces publiées atteint
 * `minListingsForHomeSection` — une catégorie fraîchement ouverte avec 3 annonces fait plus
 * de mal (impression de site mort) qu'une absence de section.
 */
export async function GET() {
  const cache = getCacheStore();

  try {
    const cached = await cache.get<HomeSection[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { sections: cached },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
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

    const categoriesSnapshot = await db
      .collection('listing_categories')
      .where('parentId', '==', null)
      .where('isActive', '==', true)
      .get();

    type RootCategoryDoc = {
      id: string;
      name?: unknown;
      slug?: unknown;
      order?: unknown;
      minListingsForHomeSection?: unknown;
      defaultDensity?: unknown;
    };

    const roots: RootCategoryDoc[] = categoriesSnapshot.docs
      .map((doc): RootCategoryDoc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .sort((a, b) => (typeof a.order === 'number' ? a.order : 0) - (typeof b.order === 'number' ? b.order : 0));

    const sections: HomeSection[] = [];

    for (const root of roots) {
      const rootName = typeof root.name === 'string' ? root.name : root.id;
      const minListings =
        typeof root.minListingsForHomeSection === 'number' ? root.minListingsForHomeSection : 12;
      const density =
        root.defaultDensity === 'showcase' || root.defaultDensity === 'compact'
          ? root.defaultDensity
          : 'standard';

      // ⚠️ Requiert un index composite Firestore (categoryPath.lvl0 Asc, state Asc,
      // moderationStatus Asc, createdAt Desc) sur `properties` — à créer manuellement
      // (Console Firebase ou `firebase deploy --only firestore:indexes`) avant que cette
      // route fonctionne ; jusque-là elle échoue proprement et CategoryHomeSections reste
      // invisible (voir son fetch avec repli sur [] si !response.ok), aucun risque de
      // crash public. Voir docs/marketplace-multi-categories/07-lots-et-sequencement.md.
      const baseQuery = db
        .collection('properties')
        .where('categoryPath.lvl0', '==', rootName)
        .where('state', '==', 'IN_PROGRESS')
        .where('moderationStatus', '==', 'APPROVED');

      const countSnapshot = await baseQuery.count().get();
      const count = countSnapshot.data().count;
      if (count < minListings) {
        continue;
      }

      const sampleSnapshot = await baseQuery
        .orderBy('createdAt', 'desc')
        .limit(SAMPLE_SIZE)
        .get();

      sections.push({
        id: root.id,
        slug: typeof root.slug === 'string' ? root.slug : root.id,
        name: rootName,
        density,
        items: sampleSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Property),
      });
    }

    await cache.set(CACHE_KEY, sections, CACHE_TTL_SECONDS);

    return NextResponse.json(
      { sections },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
    );
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/categories/home-sections',
      fallbackMessage: 'Failed to fetch category home sections',
    });
  }
}
