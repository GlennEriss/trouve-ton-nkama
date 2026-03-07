import type { Property, StatusProperty, TypeProperty } from '@/models/annonce';
import type { StateCreation } from '@/models/creation';

export type AdSortBy = 'createdAt' | 'updatedAt' | 'price' | 'title';
export type AdSortOrder = 'asc' | 'desc';
export type AdPromotedFilter = '' | 'true' | 'false';

export type AdManagementFilters = {
  q: string;
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
  appliedFilters: {
    q: string;
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
