import { deleteProperty, updateProperty } from '@/db/property.db';
import { createLogger } from '@/lib/logger';
import { invalidatePropertyCountCache } from '@/lib/invalidate-property-count-cache';
import type { StateCreation } from '@/models/creation';
import type {
  AdListResponse,
  AdManagementService,
  ToggleAdStateInput,
} from './ad-management.service.interface';

const logger = createLogger('announcer.ad-management.service');

const EMPTY_RESPONSE: AdListResponse = {
  success: true,
  items: [],
  pagination: {
    total: 0,
    limit: 0,
    cursor: '0',
    nextCursor: null,
    hasMore: false,
  },
  summary: {
    global: {
      total: 0,
      active: 0,
      archived: 0,
      promoted: 0,
      forRent: 0,
      forSale: 0,
      pendingModeration: 0,
      categoriesUsed: 0,
    },
    filtered: {
      total: 0,
      active: 0,
      archived: 0,
      promoted: 0,
      forRent: 0,
      forSale: 0,
      pendingModeration: 0,
      categoriesUsed: 0,
    },
  },
  scopeCounts: { immobilier: 0, marketplace: 0 },
  categoryOptions: [],
  appliedFilters: {
    q: '',
    scope: 'immobilier',
    category: '',
    type: '',
    status: '',
    state: '',
    promoted: '',
    priceMin: null,
    priceMax: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
};

function getNextState(currentState: StateCreation): StateCreation {
  return currentState === 'ARCHIVED' ? 'IN_PROGRESS' : 'ARCHIVED';
}

export class AdManagementServiceImpl implements AdManagementService {
  async listAds(params: {
    filters: {
      q: string;
      scope: string;
      category: string;
      type: string;
      status: string;
      state: string;
      promoted: string;
      priceMin: string;
      priceMax: string;
      sortBy: string;
      sortOrder: string;
    };
    limit: number;
    cursor: string | null;
  }): Promise<AdListResponse> {
    const queryParams = new URLSearchParams();
    queryParams.set('limit', String(params.limit));
    queryParams.set('cursor', params.cursor ?? '0');

    if (params.filters.q.trim()) {
      queryParams.set('q', params.filters.q.trim());
    }
    queryParams.set('scope', params.filters.scope);
    if (params.filters.category) {
      queryParams.set('category', params.filters.category);
    }
    if (params.filters.type) {
      queryParams.set('type', params.filters.type);
    }
    if (params.filters.status) {
      queryParams.set('status', params.filters.status);
    }
    if (params.filters.state) {
      queryParams.set('state', params.filters.state);
    }
    if (params.filters.promoted) {
      queryParams.set('promoted', params.filters.promoted);
    }
    if (params.filters.priceMin.trim()) {
      queryParams.set('priceMin', params.filters.priceMin.trim());
    }
    if (params.filters.priceMax.trim()) {
      queryParams.set('priceMax', params.filters.priceMax.trim());
    }
    queryParams.set('sortBy', params.filters.sortBy);
    queryParams.set('sortOrder', params.filters.sortOrder);

    try {
      const response = await fetch(`/api/announcer/ads?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        logger.warn('Ad list request failed', {
          status: response.status,
          statusText: response.statusText,
        });
        return EMPTY_RESPONSE;
      }

      const payload = (await response.json()) as AdListResponse;
      return payload;
    } catch (error) {
      logger.error('Ad list request crashed', { error });
      return EMPTY_RESPONSE;
    }
  }

  async toggleAdState(input: ToggleAdStateInput): Promise<StateCreation> {
    const nextState = getNextState(input.currentState);
    const updated = await updateProperty(input.id, {
      state: nextState,
    } as any);

    if (!updated) {
      throw new Error('AD_STATE_UPDATE_FAILED');
    }

    void invalidatePropertyCountCache();
    return nextState;
  }

  async removeAd(id: string): Promise<boolean> {
    const removed = await deleteProperty(id);
    if (!removed) {
      throw new Error('AD_DELETE_FAILED');
    }

    void invalidatePropertyCountCache();
    return true;
  }
}

export const adManagementService: AdManagementService = new AdManagementServiceImpl();
