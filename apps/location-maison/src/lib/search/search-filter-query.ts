interface SearchParamsReader {
  get(name: string): string | null;
}

const FACET_FILTERS = [
  ['city', 'city'],
  ['street', 'street'],
  ['province', 'province'],
  ['typeProperty', 'typeProperty'],
  ['status', 'status'],
  ['tags', 'tags'],
  // Multi-catégories (Lot 4) : `category` porte le NOM exact de la catégorie racine tel
  // qu'indexé dans categoryPath.lvl0 (ex. "Immobilier", "Mode"), pas un slug — la valeur
  // vient toujours de GET /api/categories/active, jamais saisie librement par l'utilisateur.
  // Absent de l'URL (comportement historique) => aucun filtre, résultats inchangés.
  ['category', 'categoryPath.lvl0'],
  // Filtre par feuille précise (ex. "vetements", "chaussures" — tuiles "Types d'annonces"
  // de la home, Lot 5/9) : valeur = id de document listing_categories, indexé tel quel
  // dans categoryId (voir extensions/firestore-algolia-search.env).
  ['categoryId', 'categoryId'],
] as const;

const NUMERIC_FILTERS = [
  ['minPrice', 'price', '>='],
  ['maxPrice', 'price', '<='],
  ['minArea', 'area', '>='],
  ['maxArea', 'area', '<='],
  ['minNbrRooms', 'nbrRooms', '>='],
  ['maxNbrRooms', 'nbrRooms', '<='],
] as const;

function splitParamValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeAlgoliaFilterValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFacetFilter(attribute: string, rawValue: string) {
  const filters = splitParamValues(rawValue).map(
    (value) => `${attribute}:"${escapeAlgoliaFilterValue(value)}"`,
  );

  if (filters.length === 0) return null;
  return filters.length === 1 ? filters[0] : `(${filters.join(' OR ')})`;
}

function normalizeNonNegativeNumber(rawValue: string | null) {
  if (!rawValue?.trim()) return null;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) return null;

  return String(value);
}

export function buildPublicSearchFilters(searchParams: SearchParamsReader) {
  const filters = [
    'state:"IN_PROGRESS"',
    'moderationStatus:"APPROVED"',
  ];

  FACET_FILTERS.forEach(([param, attribute]) => {
    const filter = buildFacetFilter(attribute, searchParams.get(param) ?? '');
    if (filter) filters.push(filter);
  });

  NUMERIC_FILTERS.forEach(([param, attribute, operator]) => {
    const value = normalizeNonNegativeNumber(searchParams.get(param));
    if (value !== null) filters.push(`${attribute} ${operator} ${value}`);
  });

  return filters.join(' AND ');
}
