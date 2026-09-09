import { apiFetch } from './client';
import type { PropertyImage } from '../lib/propertyImage';

// Passe par le MÊME proxy que le web (/api/algolia/search, voir apps/location-maison/src/app/
// api/algolia/search/route.ts) plutôt que d'appeler Algolia directement depuis le téléphone —
// sinon le cache serveur qui limite la facture Algolia est contourné par ce deuxième client.
// Voir docs/location-maison/troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md.
const ALGOLIA_INDEX_NAME = 'location-maison_property-index';
// N'affiche que les annonces actives et approuvées — même filtre que ALGOLIA_BASE_FILTER
// côté web (src/lib/algolia.ts).
const ALGOLIA_BASE_FILTER = 'state:"IN_PROGRESS" AND moderationStatus:"APPROVED"';
const HITS_PER_PAGE = 20;

export type SearchFilters = {
  typeProperty?: string[];
  status?: 'FOR_RENT' | 'FOR_SALE';
  city?: string;
  province?: string;
  budgetMinXaf?: number;
  budgetMaxXaf?: number;
};

// Même syntaxe de filtre Algolia que buildPublicSearchFilters côté web (src/lib/search/
// search-filter-query.ts) : une seule chaîne `filters` jointe par AND, pas de numericFilters
// séparé. Échappement minimal (backslash puis guillemet) pour toute valeur libre insérée
// entre guillemets, comme escapeAlgoliaFilterValue côté web.
function escapeAlgoliaFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildFilters(filters: SearchFilters): string {
  const clauses = [ALGOLIA_BASE_FILTER];

  if (filters.typeProperty?.length) {
    const typeClauses = filters.typeProperty.map((t) => `typeProperty:"${escapeAlgoliaFilterValue(t)}"`);
    clauses.push(typeClauses.length > 1 ? `(${typeClauses.join(' OR ')})` : typeClauses[0]);
  }
  if (filters.status) {
    clauses.push(`status:"${filters.status}"`);
  }
  if (filters.city?.trim()) {
    clauses.push(`city:"${escapeAlgoliaFilterValue(filters.city.trim())}"`);
  }
  if (filters.province?.trim()) {
    clauses.push(`province:"${escapeAlgoliaFilterValue(filters.province.trim())}"`);
  }
  if (filters.budgetMinXaf) {
    clauses.push(`price >= ${filters.budgetMinXaf}`);
  }
  if (filters.budgetMaxXaf) {
    clauses.push(`price <= ${filters.budgetMaxXaf}`);
  }

  return clauses.join(' AND ');
}

export type PropertyHit = {
  objectID: string;
  title?: string;
  description?: string;
  city?: string;
  province?: string;
  street?: string;
  price?: number;
  typeProperty?: string;
  status?: 'FOR_RENT' | 'FOR_SALE';
  area?: number;
  nbrRooms?: number;
  nbrBathrooms?: number;
  images?: PropertyImage[];
};

type AlgoliaSearchResponse<T> = {
  results: Array<{ hits: T[]; nbPages: number; page: number }>;
};

export async function searchProperties(
  searchText: string,
  page = 0,
  filters: SearchFilters = {},
): Promise<{ hits: PropertyHit[]; nbPages: number }> {
  const response = await apiFetch<AlgoliaSearchResponse<PropertyHit>>('/api/algolia/search', {
    method: 'POST',
    body: {
      requests: [
        {
          indexName: ALGOLIA_INDEX_NAME,
          params: {
            query: searchText,
            filters: buildFilters(filters),
            hitsPerPage: HITS_PER_PAGE,
            page,
          },
        },
      ],
    },
  });

  const result = response.results[0];
  return { hits: result?.hits ?? [], nbPages: result?.nbPages ?? 0 };
}
