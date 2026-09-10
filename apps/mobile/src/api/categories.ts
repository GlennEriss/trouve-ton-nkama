import { apiFetch } from './client';

// Même régie multi-catégories que le web (Lot 4/5, voir docs/marketplace-multi-categories/) —
// mêmes endpoints, jamais de liste "Immobilier"/"Mode" codée en dur côté mobile.
export type ActiveCategory = { id: string; slug: string; name: string; icon: string | null; order: number };

export async function getActiveCategories(): Promise<ActiveCategory[]> {
  const data = await apiFetch<{ categories?: ActiveCategory[] }>('/api/categories/active');
  return data.categories ?? [];
}

// `options` seulement pour les champs type "enum" — les champs "text" (ex. marque) n'ont pas de
// liste de valeurs fixe côté schéma : le web les résout dynamiquement via une requête de facette
// Algolia en direct (useAlgoliaFacetOptions), volontairement HORS scope ici — le mobile passe
// toujours par le proxy /api/algolia/search pour préserver le cache serveur qui limite la
// facture Algolia (voir algolia.ts), et répliquer un appel Algolia direct casserait ça.
export type AttributeField = {
  key: string;
  label: string;
  type: 'enum' | 'text';
  options?: string[];
  required: boolean;
  facetable: boolean;
  primary: boolean;
};

export type PublishableCategoryLeaf = {
  id: string;
  slug: string;
  name: string;
  rootId: string;
  rootName: string;
  locationPrecision: string;
  attributeSchema: AttributeField[];
};

export async function getPublishableLeaves(): Promise<PublishableCategoryLeaf[]> {
  const data = await apiFetch<{ leaves?: PublishableCategoryLeaf[] }>('/api/categories/publishable-leaves');
  return data.leaves ?? [];
}
