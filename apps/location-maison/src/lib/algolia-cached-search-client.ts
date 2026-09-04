// Client Algolia "cache-aware" côté navigateur : même méthode `.search()` que le client
// officiel (algoliasearch/lite), mais route chaque appel via /api/algolia/search au lieu
// d'appeler Algolia directement — ce qui permet de mutualiser les requêtes identiques
// entre visiteurs (cache serveur, voir algolia-search-proxy.ts) plutôt que de facturer un
// appel Algolia par visiteur et par interaction.
//
// Utilisé à la fois comme `searchClient` de <InstantSearch> (AlgoliaContext.tsx, appelle
// `.search(requestsArray)`) et comme client direct des hooks de facettes hors
// InstantSearch (useAlgoliaFacetOptions.ts, useAlgoliaLocationOptions.ts via
// src/lib/algolia.ts, qui appellent `.search({requests: [...]})`) — les deux conventions
// d'appel sont supportées nativement par algoliasearch/lite, donc on les gère ici aussi.
// Voir docs/location-maison/troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md.

export type AlgoliaProxyRequestShape = Record<string, unknown>;

type AlgoliaSearchMethodParams =
  | AlgoliaProxyRequestShape[]
  | { requests: AlgoliaProxyRequestShape[] };

export interface AlgoliaSearchResponse<T = unknown> {
  results: T[];
}

const PROXY_ENDPOINT = '/api/algolia/search';

function extractRequests(params: AlgoliaSearchMethodParams): AlgoliaProxyRequestShape[] {
  return Array.isArray(params) ? params : params.requests;
}

export interface CachedAlgoliaSearchClient {
  search: <T = unknown>(params: AlgoliaSearchMethodParams) => Promise<AlgoliaSearchResponse<T>>;
}

export function createCachedAlgoliaSearchClient(): CachedAlgoliaSearchClient {
  return {
    async search<T = unknown>(params: AlgoliaSearchMethodParams): Promise<AlgoliaSearchResponse<T>> {
      const requests = extractRequests(params);

      const response = await fetch(PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        throw new Error(`Algolia proxy search failed (${response.status})`);
      }

      return response.json() as Promise<AlgoliaSearchResponse<T>>;
    },
  };
}

export const cachedAlgoliaSearchClient = createCachedAlgoliaSearchClient();
