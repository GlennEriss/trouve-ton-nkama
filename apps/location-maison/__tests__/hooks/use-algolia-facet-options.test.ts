import { renderHook } from '@testing-library/react'

let capturedOptions: any[] = []

jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => {
    capturedOptions.push(options)
    return { data: {}, isLoading: false }
  },
}))

const searchMock = jest.fn()
jest.mock('@/lib/algolia', () => ({
  algoliaClient: { search: (...args: any[]) => searchMock(...args) },
  ALGOLIA_INDEX_NAME: 'location-maison_property-index',
  ALGOLIA_BASE_FILTER: 'state:"IN_PROGRESS" AND moderationStatus:"APPROVED"',
}))

import {
  useAlgoliaTypePropertyOptions,
  useAlgoliaTagOptions,
  useAlgoliaCategoryAttributeOptions,
} from '@/hooks/useAlgoliaFacetOptions'

describe('useAlgoliaFacetOptions', () => {
  beforeEach(() => {
    capturedOptions = []
    searchMock.mockReset()
    searchMock.mockResolvedValue({ results: [{ facets: {} }] })
  })

  it('interroge typeProperty avec seulement le filtre de base (comportement inchangé)', async () => {
    renderHook(() => useAlgoliaTypePropertyOptions())
    const { queryKey, queryFn } = capturedOptions[0]

    expect(queryKey).toEqual(['algolia-facets', 'typeProperty'])
    await queryFn()
    expect(searchMock).toHaveBeenCalledWith({
      requests: [expect.objectContaining({
        facets: ['typeProperty'],
        filters: 'state:"IN_PROGRESS" AND moderationStatus:"APPROVED"',
      })],
    })
  })

  it('interroge tags avec seulement le filtre de base (comportement inchangé)', async () => {
    renderHook(() => useAlgoliaTagOptions())
    const { queryKey, queryFn } = capturedOptions[0]

    expect(queryKey).toEqual(['algolia-facets', 'tags'])
    await queryFn()
    expect(searchMock).toHaveBeenCalledWith({
      requests: [expect.objectContaining({
        facets: ['tags'],
        filters: 'state:"IN_PROGRESS" AND moderationStatus:"APPROVED"',
      })],
    })
  })

  it('scope un attribut de categorie par categoryId', async () => {
    renderHook(() => useAlgoliaCategoryAttributeOptions('taille', 'vetements'))
    const { queryKey, queryFn, enabled } = capturedOptions[0]

    expect(queryKey).toEqual(['algolia-facets', 'category-attribute', 'vetements', 'taille'])
    expect(enabled).toBe(true)
    await queryFn()
    expect(searchMock).toHaveBeenCalledWith({
      requests: [expect.objectContaining({
        facets: ['attributes.taille'],
        filters: 'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND categoryId:"vetements"',
      })],
    })
  })

  it('desactive la requete quand categoryId est absent', () => {
    renderHook(() => useAlgoliaCategoryAttributeOptions('taille', undefined))
    const { enabled } = capturedOptions[0]

    expect(enabled).toBe(false)
  })
})
