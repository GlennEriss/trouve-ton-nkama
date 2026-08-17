import type { Property, StatusProperty, TypeProperty } from '@/models/annonce';
import type { StateCreation } from '@/models/creation';

export type AdScope = 'immobilier' | 'marketplace';
export type AdSortBy = 'createdAt' | 'updatedAt' | 'price' | 'title';
export type AdSortOrder = 'asc' | 'desc';
export type AdPromotedFilter = '' | 'true' | 'false';

export type AdManagementFilters = {
  q: string;
  /** Onglet courant. L'immobilier et le marketplace n'ont ni les mêmes filtres ni les mêmes stats. */
  scope: AdScope;
  /** Filtre marketplace : identifiant de catégorie feuille (ex. `parfums-beaute`). */
  category: string;
  type: '' | TypeProperty;
  status: '' | StatusProperty;
  state: '' | StateCreation;
  promoted: AdPromotedFilter;
  priceMin: string;
  priceMax: string;
  sortBy: AdSortBy;
  sortOrder: AdSortOrder;
};

export type AdSummary = {
  total: number;
  active: number;
  archived: number;
  promoted: number;
  forRent: number;
  forSale: number;
  /** Annonces en attente de modération — la statistique qui compte côté marketplace. */
  pendingModeration: number;
  /** Nombre de catégories distinctes utilisées. */
  categoriesUsed: number;
};

export type AdScopeCounts = Record<AdScope, number>;

export type AdCategoryOption = {
  id: string;
  label: string;
  count: number;
};

export type AdListResponse = {
  success: boolean;
  items: Property[];
  pagination: {
    total: number;
    limit: number;
    cursor: string;
    nextCursor: string | null;
    hasMore: boolean;
  };
  summary: {
    global: AdSummary;
    filtered: AdSummary;
  };
  /** Totaux par onglet, calculés hors filtres pour rester stables. */
  scopeCounts: AdScopeCounts;
  /** Catégories réellement présentes dans l'onglet courant. */
  categoryOptions: AdCategoryOption[];
  appliedFilters: {
    q: string;
    scope: AdScope;
    category: string;
    type: string;
    status: string;
    state: string;
    promoted: string;
    priceMin: number | null;
    priceMax: number | null;
    sortBy: AdSortBy;
    sortOrder: AdSortOrder;
  };
};

export type ToggleAdStateInput = {
  id: string;
  currentState: StateCreation;
};

export interface AdManagementService {
  listAds(params: {
    filters: AdManagementFilters;
    limit: number;
    cursor: string | null;
  }): Promise<AdListResponse>;
  toggleAdState(input: ToggleAdStateInput): Promise<StateCreation>;
  removeAd(id: string): Promise<boolean>;
}
