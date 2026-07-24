import { act, renderHook } from '@testing-library/react'

import { DEFAULT_AD_FILTERS, useAdManagement } from '@/features/announcer/ad-management/hooks/useAdManagement'
import type { Property } from '@/models/annonce'

const listAdsMock = jest.fn()
const toggleStateMock = jest.fn()
const removeAdMock = jest.fn()
const invalidateQueriesMock = jest.fn()
const fetchNextPageMock = jest.fn()

let currentUser: { uid: string } | null
let queryOptions: Record<string, any>
let queryState: Record<string, any>

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: currentUser }),
}))

jest.mock('@/features/announcer/ad-management/services', () => ({
  adManagementService: {
    listAds: (...args: unknown[]) => listAdsMock(...args),
    toggleAdState: (...args: unknown[]) => toggleStateMock(...args),
    removeAd: (...args: unknown[]) => removeAdMock(...args),
  },
}))

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
  useInfiniteQuery: (options: Record<string, any>) => {
    queryOptions = options
    return queryState
  },
  useMutation: (options: Record<string, any>) => ({
    isPending: false,
    mutateAsync: async (input: unknown) => {
      try {
        const payload = await options.mutationFn(input)
        await options.onSuccess?.(payload)
        return payload
      } catch (error) {
        options.onError?.(error)
        throw error
      }
    },
  }),
}))

const summary = {
  global: { total: 2, active: 1, archived: 1, promoted: 0, forRent: 1, forSale: 1 },
  filtered: { total: 1, active: 1, archived: 0, promoted: 0, forRent: 1, forSale: 0 },
}

const ad = {
  id: 'property-hook-9b',
  state: 'IN_PROGRESS',
  title: 'Maison test',
} as Property

describe('useAdManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    currentUser = { uid: 'announcer-hook-9b' }
    queryState = {
      data: {
        pages: [
          { items: [ad], pagination: { nextCursor: 'cursor-2' }, summary },
          { items: [{ ...ad, id: 'property-hook-9b-2' }], pagination: { nextCursor: null }, summary },
        ],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      fetchNextPage: fetchNextPageMock,
    }
    listAdsMock.mockResolvedValue({ items: [ad], pagination: { nextCursor: null }, summary })
    toggleStateMock.mockResolvedValue('ARCHIVED')
    removeAdMock.mockResolvedValue(undefined)
    invalidateQueriesMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('agrège les pages et prépare une requête paginée pour l annonceur', async () => {
    const { result } = renderHook(() => useAdManagement())

    expect(result.current.userUid).toBe('announcer-hook-9b')
    expect(result.current.items).toHaveLength(2)
    expect(result.current.total).toBe(2)
    expect(result.current.filteredTotal).toBe(1)
    expect(result.current.hasMore).toBe(true)
    expect(queryOptions.enabled).toBe(true)
    expect(queryOptions.queryKey).toEqual(expect.arrayContaining(['announcer-ad-management', 'announcer-hook-9b']))

    await expect(queryOptions.queryFn({ pageParam: 'cursor-2' })).resolves.toEqual(expect.objectContaining({ items: [ad] }))
    expect(listAdsMock).toHaveBeenCalledWith(expect.objectContaining({
      limit: 12,
      cursor: 'cursor-2',
      filters: expect.objectContaining(DEFAULT_AD_FILTERS),
    }))
    expect(queryOptions.getNextPageParam({ pagination: { nextCursor: 'next' } })).toBe('next')
    expect(queryOptions.getNextPageParam({ pagination: { nextCursor: null } })).toBeUndefined()
  })

  it('normalise les filtres, applique le debounce et sait tout réinitialiser', () => {
    const { result } = renderHook(() => useAdManagement())

    act(() => {
      result.current.setSearchInput('  Akébé  ')
      result.current.setPriceMin('40 000 FCFA')
      result.current.setPriceMax('100.000')
      result.current.setTypeFilter('Home')
      result.current.setStatusFilter('FOR_RENT')
      result.current.setStateFilter('ARCHIVED')
      result.current.setPromotedFilter('true')
      result.current.setSort('price', 'desc')
      jest.advanceTimersByTime(350)
    })

    expect(result.current.searchInput).toBe('  Akébé  ')
    expect(result.current.filters).toEqual(expect.objectContaining({
      priceMin: '40000',
      priceMax: '100000',
      type: 'Home',
      status: 'FOR_RENT',
      state: 'ARCHIVED',
      promoted: 'true',
      sortBy: 'price',
      sortOrder: 'desc',
    }))
    expect(result.current.hasActiveFilters).toBe(true)

    act(() => result.current.resetFilters())
    expect(result.current.searchInput).toBe('')
    expect(result.current.filters).toEqual(DEFAULT_AD_FILTERS)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('charge la suite, archive et supprime en invalidant le cache', async () => {
    const { result } = renderHook(() => useAdManagement())

    act(() => result.current.fetchNextPage())
    expect(fetchNextPageMock).toHaveBeenCalledTimes(1)

    await act(async () => result.current.toggleAdState(ad))
    expect(toggleStateMock).toHaveBeenCalledWith({ id: 'property-hook-9b', currentState: 'IN_PROGRESS' })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['announcer-ad-management', 'announcer-hook-9b'] })

    await act(async () => result.current.removeAd('property-hook-9b'))
    expect(removeAdMock).toHaveBeenCalledWith('property-hook-9b')
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(2)
  })

  it('ne pagine pas pendant un chargement et expose les erreurs de mutation', async () => {
    queryState = { ...queryState, isFetchingNextPage: true }
    toggleStateMock.mockRejectedValue(new Error('Firestore indisponible'))
    removeAdMock.mockRejectedValue(new Error('Permission refusée'))
    const { result } = renderHook(() => useAdManagement())

    act(() => result.current.fetchNextPage())
    expect(fetchNextPageMock).not.toHaveBeenCalled()

    await act(async () => {
      await expect(result.current.toggleAdState(ad)).rejects.toThrow('Firestore indisponible')
    })
    expect(result.current.error).toMatch(/mettre à jour/)

    await act(async () => {
      await expect(result.current.removeAd('property-hook-9b')).rejects.toThrow('Permission refusée')
    })
    expect(result.current.error).toMatch(/supprimer/)
  })

  it('désactive la requête sans utilisateur et utilise un résumé vide', () => {
    currentUser = null
    queryState = { ...queryState, data: undefined, hasNextPage: false }
    const { result } = renderHook(() => useAdManagement())

    expect(queryOptions.enabled).toBe(false)
    expect(result.current.userUid).toBeNull()
    expect(result.current.items).toEqual([])
    expect(result.current.summary.global.total).toBe(0)
  })
})
