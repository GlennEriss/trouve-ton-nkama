import { MemoryCacheStore } from '@/lib/cache';

export interface AlgoliaProxyRequest {
  indexName?: string;
  params?: (Record<string, unknown> & { hitsPerPage?: number }) | undefined;
  [key: string]: unknown;
}

const DEFAULT_HITS_TTL_SECONDS = 30;
const DEFAULT_FACETS_TTL_SECONDS = 120;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

// Clé stable : mêmes filtres/facettes/pagination -> même clé, quel que soit l'ordre des
// propriétés dans l'objet reçu (les widgets InstantSearch et nos hooks ne garantissent
// pas un ordre constant).
export function algoliaRequestCacheKey(request: AlgoliaProxyRequest): string {
  return `algolia:search:${JSON.stringify(canonicalize(request))}`;
}

// Une requête "facettes uniquement" (hitsPerPage:0 — menus/listes de raffinement, et
// useAlgoliaFacetOptions/useAlgoliaLocationOptions qui ne veulent que des compteurs)
// tolère un cache plus long : un compteur "23 studios" n'a pas besoin d'être exact à la
// seconde près. Une requête qui retourne de vraies annonces (hits) garde un TTL plus
// court pour rester raisonnablement frais après une nouvelle publication/approbation.
export function algoliaRequestTtlSeconds(request: AlgoliaProxyRequest): number {
  const isFacetOnly = request.params?.hitsPerPage === 0;
  const envValue = isFacetOnly
    ? process.env.ALGOLIA_CACHE_FACETS_TTL_SECONDS
    : process.env.ALGOLIA_CACHE_HITS_TTL_SECONDS;
  const fallback = isFacetOnly ? DEFAULT_FACETS_TTL_SECONDS : DEFAULT_HITS_TTL_SECONDS;
  const parsed = envValue ? Number(envValue) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Cache dédié au proxy Algolia, toujours en mémoire process — volontairement
 * indépendant de getCacheStore()/CACHE_BACKEND : un cache sollicité à quasi chaque
 * interaction de filtre doit rester gratuit et sans aller-retour réseau, quel que soit
 * le backend choisi par ailleurs pour le reste de l'app (Redis suspendu, Firestore en
 * repli...). Voir memory-cache-store.ts pour les limites assumées (non partagé entre
 * instances serveur, non persistant entre redémarrages).
 */
export const algoliaProxyCache = new MemoryCacheStore();

export type AlgoliaSearchFn = (
  requests: AlgoliaProxyRequest[],
) => Promise<{ results: unknown[] }>;

/**
 * Résout un lot de requêtes Algolia en mutualisant celles déjà en cache (identiques à
 * une requête récente, tous visiteurs confondus) et en ne renvoyant à Algolia que les
 * requêtes manquantes, groupées en un seul appel multi-index — exactement comme le
 * ferait un appel direct au client Algolia. L'ordre des résultats est préservé.
 */
export async function resolveAlgoliaSearchRequests(
  requests: AlgoliaProxyRequest[],
  fetchFromAlgolia: AlgoliaSearchFn,
): Promise<{ results: unknown[] }> {
  if (requests.length === 0) {
    return { results: [] };
  }

  const keys = requests.map(algoliaRequestCacheKey);
  const cached = await Promise.all(keys.map((key) => algoliaProxyCache.get<unknown>(key)));

  const missIndexes: number[] = [];
  cached.forEach((value, index) => {
    if (value === null) missIndexes.push(index);
  });

  const results: unknown[] = [...cached];

  if (missIndexes.length > 0) {
    const missRequests = missIndexes.map((index) => requests[index]);
    const liveResponse = await fetchFromAlgolia(missRequests);
    const liveResults = liveResponse.results;

    await Promise.all(
      missIndexes.map(async (originalIndex, position) => {
        const value = liveResults[position];
        results[originalIndex] = value;
        await algoliaProxyCache.set(
          keys[originalIndex],
          value,
          algoliaRequestTtlSeconds(requests[originalIndex]),
        );
      }),
    );
  }

  return { results };
}
