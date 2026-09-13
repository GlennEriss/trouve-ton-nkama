import { act, renderHook, waitFor } from '@testing-library/react'

const getProperties = jest.fn()

jest.mock('@/db/property.db', () => ({ getProperties }))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: jest.fn() }),
}))

import { usePropertiesPagination } from '@/hooks/use-properties-pagination'

describe('usePropertiesPagination', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('n avance pas au-dela de la derniere page', async () => {
    getProperties.mockResolvedValue({ properties: [{ id: 'p1' }], lastDoc: null })
    const { result } = renderHook(() => usePropertiesPagination({ limitPerPage: 10 }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasNextPage).toBe(false)

    act(() => result.current.nextPage())
    expect(result.current.currentPage).toBe(1)
    expect(getProperties).toHaveBeenCalledTimes(1)
  })

  it('utilise le curseur suivant et reutilise une page deja chargee', async () => {
    getProperties
      .mockResolvedValueOnce({ properties: [{ id: 'p1' }], lastDoc: 'p1' })
      .mockResolvedValueOnce({ properties: [{ id: 'p2' }], lastDoc: null })
    const { result } = renderHook(() => usePropertiesPagination({ limitPerPage: 1 }))

    await waitFor(() => expect(result.current.hasNextPage).toBe(true))
    act(() => result.current.nextPage())
    await waitFor(() => expect(result.current.currentPage).toBe(2))
    await waitFor(() => expect(result.current.properties).toEqual([{ id: 'p2' }]))
    expect(getProperties).toHaveBeenLastCalledWith(expect.objectContaining({ lastDoc: 'p1' }))

    act(() => result.current.previousPage())
    await waitFor(() => expect(result.current.properties).toEqual([{ id: 'p1' }]))
    expect(getProperties).toHaveBeenCalledTimes(2)
  })

  it('invalide pages et curseurs quand un filtre change', async () => {
    getProperties
      .mockResolvedValueOnce({ properties: [{ id: 'studio' }], lastDoc: null })
      .mockResolvedValueOnce({ properties: [{ id: 'villa' }], lastDoc: null })
    const { result, rerender } = renderHook(
      ({ type }) => usePropertiesPagination({ limitPerPage: 10, type }),
      { initialProps: { type: 'Studio' } },
    )

    await waitFor(() => expect(result.current.properties).toEqual([{ id: 'studio' }]))
    rerender({ type: 'Villa' })
    await waitFor(() => expect(result.current.properties).toEqual([{ id: 'villa' }]))
    expect(getProperties).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'Villa',
      lastDoc: null,
    }))
  })
})
