import { NextResponse } from 'next/server';
import { getCacheStore } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.categories.publishable-leaves');

function toAttributeType(value: unknown): 'text' | 'number' | 'enum' | 'boolean' {
  if (value === 'number' || value === 'enum' || value === 'boolean') {
    return value;
  }
  return 'text';
}

const CACHE_KEY = 'categories:publishable-leaves';
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CATALOG_TTL ?? '600', 10);

export type PublishableAttributeField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'enum' | 'boolean';
  options?: string[];
  required: boolean;
};

export type PublishableCategoryLeaf = {
  id: string;
  slug: string;
  name: string;
  rootId: string;
  rootName: string;
  locationPrecision: 'exact' | 'city' | 'none';
  attributeSchema: PublishableAttributeField[];
};

/**
 * Feuilles de catégories actives publiables par un annonceur (Lot 7, voir
 * docs/marketplace-multi-categories/07-lots-et-sequencement.md). Exclut toujours
 * l'immobilier : ses 14 builders existants (`builders/property-form/`) restent le seul
 * chemin de publication pour cette catégorie tant qu'ils n'ont pas été migrés (Lot 10,
 * non planifié) — ce moteur générique ne sert que les nouvelles catégories.
 */
export async function GET() {
  const cache = getCacheStore();

  try {
    const cached = await cache.get<PublishableCategoryLeaf[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { leaves: cached },
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

    // Une seule requête à égalité simple (isActive == true) : évite de dépendre d'un
    // index composite Firestore pour une inégalité sur parentId, le tri racine/feuille
    // se fait ensuite en mémoire (le volume de catégories reste très faible).
    const activeSnapshot = await db.collection('listing_categories').where('isActive', '==', true).get();

    const rootNameById = new Map<string, string>();
    for (const doc of activeSnapshot.docs) {
      const data = doc.data();
      if (data.parentId !== null || doc.id === 'immobilier') continue;
      rootNameById.set(doc.id, typeof data.name === 'string' ? data.name : doc.id);
    }

    const leaves: PublishableCategoryLeaf[] = activeSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const parentId = typeof data.parentId === 'string' ? data.parentId : null;
        return { doc, data, parentId };
      })
      .filter(({ parentId }) => parentId !== null && rootNameById.has(parentId))
      .map(({ doc, data, parentId }) => {
        const schema = Array.isArray(data.attributeSchema) ? data.attributeSchema : [];
        return {
          id: doc.id,
          slug: typeof data.slug === 'string' ? data.slug : doc.id,
          name: typeof data.name === 'string' ? data.name : doc.id,
          rootId: parentId as string,
          rootName: rootNameById.get(parentId as string) as string,
          locationPrecision:
            data.locationPrecision === 'exact' || data.locationPrecision === 'none'
              ? data.locationPrecision
              : 'city',
          attributeSchema: schema
            .filter((field: unknown): field is Record<string, unknown> => Boolean(field) && typeof field === 'object')
            .map(
              (field: Record<string, unknown>): PublishableAttributeField => ({
                key: String(field.key ?? ''),
                label: String(field.label ?? field.key ?? ''),
                type: toAttributeType(field.type),
                options: Array.isArray(field.options)
                  ? field.options.filter((o): o is string => typeof o === 'string')
                  : undefined,
                required: field.required === true,
              }),
            )
            .filter((field) => field.key.length > 0),
        };
      })
      .sort((a, b) => a.rootName.localeCompare(b.rootName, 'fr') || a.name.localeCompare(b.name, 'fr'));

    await cache.set(CACHE_KEY, leaves, CACHE_TTL_SECONDS);

    return NextResponse.json(
      { leaves },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
    );
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/categories/publishable-leaves',
      fallbackMessage: 'Failed to fetch publishable category leaves',
    });
  }
}
