import { NextResponse } from 'next/server';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { createLogger } from '@/lib/logger';
import { resolveAlgoliaSearchRequests, type AlgoliaProxyRequest } from '@/lib/algolia-search-proxy';

const logger = createLogger('api.algolia-search-proxy');

// Clé de recherche uniquement (jamais admin/write) : sûre à utiliser côté serveur, c'est
// la même que celle déjà exposée au navigateur via NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY.
const algoliaClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!,
);

// Une page ne monte jamais plus qu'une poignée de widgets InstantSearch/hooks de
// facettes à la fois — une valeur élevée ici n'aiderait aucun usage légitime, seulement
// un abus.
const MAX_REQUESTS_PER_BATCH = 20;

/**
 * Proxy Algolia côté serveur : mutualise les requêtes identiques entre visiteurs via un
 * cache mémoire (TTL court, voir algolia-search-proxy.ts) au lieu de facturer un appel
 * Algolia par visiteur et par interaction (recherche, filtres, cascade Province/Ville).
 *
 * Appelé uniquement par le client Algolia "cache-aware" (src/lib/algolia.ts,
 * AlgoliaContext.tsx) — jamais par Algolia directement depuis le navigateur. Voir
 * docs/location-maison/troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md.
 */
export async function POST(request: Request) {
  let body: { requests?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const requests = Array.isArray(body.requests) ? (body.requests as AlgoliaProxyRequest[]) : [];

  if (requests.length === 0) {
    return NextResponse.json({ results: [] });
  }

  if (requests.length > MAX_REQUESTS_PER_BATCH) {
    return NextResponse.json({ error: 'Too many requests in a single batch' }, { status: 400 });
  }

  try {
    const { results } = await resolveAlgoliaSearchRequests(requests, async (missRequests) => {
      const response = await algoliaClient.search(missRequests as never);
      return response as { results: unknown[] };
    });

    return NextResponse.json({ results });
  } catch (error) {
    logger.error('Algolia upstream search failed', { error });
    return NextResponse.json({ error: 'Algolia search failed' }, { status: 502 });
  }
}
