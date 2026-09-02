interface SearchParamsReader {
  get(name: string): string | null;
  keys(): IterableIterator<string>;
}

// Filtres d'attributs dynamiques par catégorie (Mode, etc.) : contrat d'URL `attr_<key>`
// déjà documenté dans docs/marketplace-multi-categories/03-page-recherche.md, traduit ici
// vers `attributes.<key>` — le champ Firestore `attributes` est indexé tel quel (objet
// imbriqué, extensions/firestore-algolia-search.env) sans aplatissement Cloud Function,
// et Algolia facette nativement les chemins imbriqués par notation pointée (déjà prouvé
// par categoryPath.lvl0/lvl1). Divergence assumée par rapport au plan d'aplatissement
// documenté, qui n'a jamais été implémenté.
const ATTRIBUTE_FILTER_PREFIX = 'attr_';
// Un nom de clé (pas seulement sa valeur) vient ici directement de l'URL — contrairement
// aux facettes fixes ci-dessus, un utilisateur pourrait forger un paramètre `attr_<x>`
// arbitraire. On borne strictement le jeu de caractères acceptés avant de l'injecter dans
// le chemin d'attribut Algolia.
const ATTRIBUTE_KEY_PATTERN = /^[a-zA-Z0-9_]+$/;

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

// Champs qui n'existent que sur une annonce immobilier (typeProperty) — `street`/`province`
// sont en plus structurellement peu fiables pour Mode (voir category-listing/create/page.tsx :
// street toujours vide, province codée en dur). Partagé avec CategoryFilterPills.tsx (purge
// ces mêmes clés de l'URL au changement de catégorie) pour éviter que les deux listes divergent
// — exactement le bug trouvé ici : sans ce filtrage, une URL forgée/partagée/issue de l'historique
// du navigateur combinant `category=Mode` avec un `street`/`province` laissé d'une recherche
// immobilier appliquait un filtre qu'aucune annonce Mode ne peut jamais satisfaire
// (`street:""` toujours), zéro résultat sans la moindre explication visible (les contrôles
// correspondants sont cachés dès que category ≠ Immobilier, voir useIsImmobilierSearchScope).
export const IMMOBILIER_ONLY_PARAMS = [
  'province', 'street', 'status', 'typeProperty', 'minArea', 'maxArea', 'minNbrRooms', 'maxNbrRooms',
] as const;

function isImmobilierSearchScope(searchParams: SearchParamsReader): boolean {
  const category = searchParams.get('category') ?? '';
  return category === '' || category === 'Immobilier';
}

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
  const immobilierScope = isImmobilierSearchScope(searchParams);
  const immobilierOnly = new Set<string>(IMMOBILIER_ONLY_PARAMS);

  FACET_FILTERS.forEach(([param, attribute]) => {
    if (!immobilierScope && immobilierOnly.has(param)) return;
    const filter = buildFacetFilter(attribute, searchParams.get(param) ?? '');
    if (filter) filters.push(filter);
  });

  NUMERIC_FILTERS.forEach(([param, attribute, operator]) => {
    if (!immobilierScope && immobilierOnly.has(param)) return;
    const value = normalizeNonNegativeNumber(searchParams.get(param));
    if (value !== null) filters.push(`${attribute} ${operator} ${value}`);
  });

  const seenAttributeParams = new Set<string>();
  for (const param of searchParams.keys()) {
    if (!param.startsWith(ATTRIBUTE_FILTER_PREFIX) || seenAttributeParams.has(param)) continue;
    seenAttributeParams.add(param);
    const attrKey = param.slice(ATTRIBUTE_FILTER_PREFIX.length);
    if (!ATTRIBUTE_KEY_PATTERN.test(attrKey)) continue;
    const filter = buildFacetFilter(`attributes.${attrKey}`, searchParams.get(param) ?? '');
    if (filter) filters.push(filter);
  }

  return filters.join(' AND ');
}
