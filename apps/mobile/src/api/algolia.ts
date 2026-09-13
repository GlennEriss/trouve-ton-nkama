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
  // Multi-catégories (voir search-filter-query.ts, web) : `category` porte le NOM exact de la
  // catégorie racine tel qu'indexé dans categoryPath.lvl0 (ex. "Immobilier", "Mode"), toujours
  // lu depuis GET /api/categories/active — jamais saisi librement. `categoryId` filtre sur une
  // feuille précise (ex. "chaussures", id de listing_categories). `attributes` = filtres
  // dynamiques par attribut de la feuille active (`attributes.<clé>`, OR entre valeurs d'une
  // même clé) — seuls les champs de type "enum" sont supportés côté mobile pour l'instant.
  category?: string;
  categoryId?: string;
  attributes?: Record<string, string[]>;
};

// Même syntaxe de filtre Algolia que buildPublicSearchFilters côté web (src/lib/search/
// search-filter-query.ts) : une seule chaîne `filters` jointe par AND, pas de numericFilters
// séparé. Échappement minimal (backslash puis guillemet) pour toute valeur libre insérée
// entre guillemets, comme escapeAlgoliaFilterValue côté web.
function escapeAlgoliaFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFacetOrClause(attribute: string, values: string[]): string {
  const clauses = values.map((v) => `${attribute}:"${escapeAlgoliaFilterValue(v)}"`);
  return clauses.length > 1 ? `(${clauses.join(' OR ')})` : clauses[0];
}

export function buildFilters(filters: SearchFilters): string {
  const clauses = [ALGOLIA_BASE_FILTER];
  // Champs immobilier uniquement (voir IMMOBILIER_ONLY_PARAMS, search-filter-query.ts web) :
  // ignorés dès que category=Mode, même s'ils traînent encore dans le state (ex. changement de
  // catégorie qui aurait mal réinitialisé) — filet de sécurité côté requête, pas seulement côté
  // UI (bug réel déjà rencontré côté web : un `province` laissé d'une recherche immobilier
  // combiné à category=Mode donnait 0 résultat sans explication, aucune annonce Mode n'ayant
  // jamais ce champ).
  const isImmobilierScope = !filters.category || filters.category === 'Immobilier';

  if (isImmobilierScope && filters.typeProperty?.length) {
    clauses.push(buildFacetOrClause('typeProperty', filters.typeProperty));
  }
  if (isImmobilierScope && filters.status) {
    clauses.push(`status:"${filters.status}"`);
  }
  if (isImmobilierScope && filters.province?.trim()) {
    clauses.push(`province:"${escapeAlgoliaFilterValue(filters.province.trim())}"`);
  }
  if (filters.city?.trim()) {
    // Hors scope immobilier (Mode, etc.), une annonce peut vendre dans plusieurs villes
    // (`cities`, tableau) — voir docs/marketplace-multi-categories/
    // 08-zones-multiples-mode.md §5, même bascule que search-filter-query.ts côté web.
    const attribute = isImmobilierScope ? 'city' : 'cities';
    clauses.push(`${attribute}:"${escapeAlgoliaFilterValue(filters.city.trim())}"`);
  }
  if (filters.budgetMinXaf) {
    clauses.push(`price >= ${filters.budgetMinXaf}`);
  }
  if (filters.budgetMaxXaf) {
    clauses.push(`price <= ${filters.budgetMaxXaf}`);
  }
  if (filters.category) {
    clauses.push(`categoryPath.lvl0:"${escapeAlgoliaFilterValue(filters.category)}"`);
  }
  if (filters.categoryId) {
    clauses.push(`categoryId:"${escapeAlgoliaFilterValue(filters.categoryId)}"`);
  }
  if (filters.attributes) {
    for (const [key, values] of Object.entries(filters.attributes)) {
      if (values?.length) clauses.push(buildFacetOrClause(`attributes.${key}`, values));
    }
  }

  return clauses.join(' AND ');
}

export type PropertyHit = {
  objectID: string;
  title?: string;
  description?: string;
  city?: string;
  province?: string;
  // Zones multiples (Mode, etc.) — voir docs/marketplace-multi-categories/
  // 08-zones-multiples-mode.md. Absent sur l'immobilier et sur une annonce Mode indexée
  // avant ce champ (repli sur `city` géré par formatListingZones, lib/listingZones.ts).
  cities?: string[];
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
