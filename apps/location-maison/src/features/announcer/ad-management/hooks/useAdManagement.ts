'use client';

import { useCurrentUser } from '@/hooks/use-current-user';
import { createLogger } from '@/lib/logger';
import type { Property, TypeProperty } from '@/models/annonce';
import type { StateCreation } from '@/models/creation';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adManagementService,
  type AdManagementFilters,
  type AdSortBy,
  type AdSortOrder,
} from '../services';

const logger = createLogger('announcer.ad-management.hook');
const AD_PAGE_SIZE = 12;
const AD_QUERY_KEY = 'announcer-ad-management';

export const DEFAULT_AD_FILTERS: Omit<AdManagementFilters, 'q'> = {
  type: '',
  status: '',
  state: '',
  promoted: '',
  priceMin: '',
  priceMax: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

type UseAdManagementReturn = {
  userUid: string | null;
  items: Property[];
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  total: number;
  filteredTotal: number;
  summary: {
    global: {
      total: number;
      active: number;
      archived: number;
      promoted: number;
      forRent: number;
      forSale: number;
    };
    filtered: {
      total: number;
      active: number;
      archived: number;
      promoted: number;
      forRent: number;
      forSale: number;
    };
  };
  searchInput: string;
  setSearchInput: (value: string) => void;
  filters: Omit<AdManagementFilters, 'q'>;
  setTypeFilter: (value: '' | TypeProperty) => void;
  setStatusFilter: (value: '' | 'FOR_RENT' | 'FOR_SALE') => void;
  setStateFilter: (value: '' | StateCreation) => void;
  setPromotedFilter: (value: '' | 'true' | 'false') => void;
  setPriceMin: (value: string) => void;
  setPriceMax: (value: string) => void;
  setSort: (sortBy: AdSortBy, sortOrder: AdSortOrder) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  fetchNextPage: () => void;
  toggleAdState: (ad: Property) => Promise<void>;
  removeAd: (adId: string) => Promise<void>;
  isTogglingState: boolean;
  isRemoving: boolean;
  error: string | null;
};

const EMPTY_SUMMARY = {
  global: {
    total: 0,
    active: 0,
    archived: 0,
    promoted: 0,
    forRent: 0,
    forSale: 0,
  },
  filtered: {
    total: 0,
    active: 0,
    archived: 0,
    promoted: 0,
    forRent: 0,
    forSale: 0,
  },
};

export function useAdManagement(): UseAdManagementReturn {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const userUid = typeof user?.uid === 'string' ? user.uid : null;
  const [filters, setFilters] = useState(DEFAULT_AD_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      q: debouncedSearch,
    }),
    [debouncedSearch, filters]
  );

  const filtersSignature = useMemo(
    () => JSON.stringify(effectiveFilters),
    [effectiveFilters]
  );

  const invalidateAdQueries = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: [AD_QUERY_KEY, userUid],
    });
  }, [queryClient, userUid]);

  const adsQuery = useInfiniteQuery({
    queryKey: [AD_QUERY_KEY, userUid, filtersSignature],
    enabled: Boolean(userUid),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const response = await adManagementService.listAds({
        filters: effectiveFilters,
        limit: AD_PAGE_SIZE,
        cursor: pageParam,
      });
      return response;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const items = useMemo(
    () => adsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [adsQuery.data?.pages]
  );

  const summary = adsQuery.data?.pages[0]?.summary ?? EMPTY_SUMMARY;
  const total = summary.global.total;
  const filteredTotal = summary.filtered.total;
  const hasMore = Boolean(adsQuery.hasNextPage);

  const toggleStateMutation = useMutation({
    mutationFn: async (ad: Property) => {
      if (!ad.id) {
        throw new Error('AD_ID_REQUIRED');
      }
      const nextState = await adManagementService.toggleAdState({
        id: ad.id,
        currentState: ad.state,
      });
      return {
        id: ad.id,
        nextState,
      };
    },
    onSuccess: async () => {
      setError(null);
      await invalidateAdQueries();
    },
    onError: (mutationError) => {
      logger.error('Failed to toggle ad state', { mutationError });
      setError("Impossible de mettre à jour l'état de l'annonce.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (adId: string) => adManagementService.removeAd(adId),
    onSuccess: async () => {
      setError(null);
      await invalidateAdQueries();
    },
    onError: (mutationError) => {
      logger.error('Failed to delete ad', { mutationError });
      setError("Impossible de supprimer l'annonce.");
    },
  });

  const setTypeFilter = useCallback((value: '' | TypeProperty) => {
    setFilters((previous) => ({ ...previous, type: value }));
  }, []);

  const setStatusFilter = useCallback((value: '' | 'FOR_RENT' | 'FOR_SALE') => {
    setFilters((previous) => ({ ...previous, status: value }));
  }, []);

  const setStateFilter = useCallback((value: '' | StateCreation) => {
    setFilters((previous) => ({ ...previous, state: value }));
  }, []);

  const setPromotedFilter = useCallback((value: '' | 'true' | 'false') => {
    setFilters((previous) => ({ ...previous, promoted: value }));
  }, []);

  const setPriceMin = useCallback((value: string) => {
    const sanitized = value.replace(/[^\d]/g, '');
    setFilters((previous) => ({ ...previous, priceMin: sanitized }));
  }, []);

  const setPriceMax = useCallback((value: string) => {
    const sanitized = value.replace(/[^\d]/g, '');
    setFilters((previous) => ({ ...previous, priceMax: sanitized }));
  }, []);

  const setSort = useCallback((sortBy: AdSortBy, sortOrder: AdSortOrder) => {
    setFilters((previous) => ({ ...previous, sortBy, sortOrder }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_AD_FILTERS);
    setSearchInput('');
    setDebouncedSearch('');
    setError(null);
  }, []);

  const fetchNextPage = useCallback(() => {
    if (!adsQuery.hasNextPage || adsQuery.isFetchingNextPage) {
      return;
    }
    void adsQuery.fetchNextPage();
  }, [adsQuery]);

  const toggleAdState = useCallback(
    async (ad: Property) => {
      await toggleStateMutation.mutateAsync(ad);
    },
    [toggleStateMutation]
  );

  const removeAd = useCallback(
    async (adId: string) => {
      await removeMutation.mutateAsync(adId);
    },
    [removeMutation]
  );

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      debouncedSearch ||
      filters.type ||
      filters.status ||
      filters.state ||
      filters.promoted ||
      filters.priceMin ||
      filters.priceMax ||
      filters.sortBy !== 'createdAt' ||
      filters.sortOrder !== 'desc'
    );
  }, [debouncedSearch, filters]);

  return {
    userUid,
    items,
    isLoading: adsQuery.isLoading,
    isFetching: adsQuery.isFetching,
    isFetchingNextPage: adsQuery.isFetchingNextPage,
    hasMore,
    total,
    filteredTotal,
    summary,
    searchInput,
    setSearchInput,
    filters,
    setTypeFilter,
    setStatusFilter,
    setStateFilter,
    setPromotedFilter,
    setPriceMin,
    setPriceMax,
    setSort,
    resetFilters,
    hasActiveFilters,
    fetchNextPage,
    toggleAdState,
    removeAd,
    isTogglingState: toggleStateMutation.isPending,
    isRemoving: removeMutation.isPending,
    error,
  };
}
