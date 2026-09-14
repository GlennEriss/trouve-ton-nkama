import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useProperty } from '@/hooks/use-property'
import type { Property } from '@/models/annonce'

const fetchMock = jest.fn()

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

const property = { id: 'prop-1', title: 'Studio meuble', price: 150000 } as unknown as Property

describe('useProperty', () => {
  let client: QueryClient

  beforeEach(() => {
    fetchMock.mockReset()
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock })
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it('sans initialData, part en isLoading puis fetch /api/property/id (comportement historique)', async () => {
    fetchMock.mockResolvedValue({ status: 200, json: async () => property })

    const { result } = renderHook(() => useProperty('prop-1'), { wrapper: wrapper(client) })

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.data).toEqual(property))
    expect(fetchMock).toHaveBeenCalledWith('/api/property/id?id=prop-1')
  })

  it('avec initialData (deja recupere cote serveur), aucun isLoading et aucun fetch au premier rendu', () => {
    // Correctif LCP /annonce/[id] (Vercel Speed Insights, 2026-09-14) : le Server Component
    // page.tsx a deja recupere la propriete via getPublicPropertyById — la propager comme
    // initialData evite le waterfall skeleton -> fetch qui retardait le LCP mobile de 10s+.
    const { result } = renderHook(() => useProperty('prop-1', property), {
      wrapper: wrapper(client),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toEqual(property)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('avec initialData, une revalidation en arriere-plan reste possible (staleTime respecte)', async () => {
    const { result } = renderHook(() => useProperty('prop-1', property), {
      wrapper: wrapper(client),
    })

    expect(result.current.data).toEqual(property)
    // staleTime = 10 minutes : pas de refetch immediat declenche par le simple montage.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
