import React from 'react'
import { render } from '@testing-library/react'

import FilterProviders from '@/providers/FilterProviders'

const refineQuery = jest.fn()
const refinePage = jest.fn()
const useConfigureMock = jest.fn()

let mockSearchParams = new URLSearchParams('category=Immobilier')

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

jest.mock('react-instantsearch', () => ({
  useSearchBox: () => ({ refine: refineQuery }),
  useConfigure: (...args: unknown[]) => useConfigureMock(...args),
  usePagination: () => ({ refine: refinePage }),
}))

// Filtres simplifiés pour ce test : seul `category` importe, pour faire varier
// `filtersString` d'un rendu à l'autre.
jest.mock('@/lib/search/search-filter-query', () => ({
  buildPublicSearchFilters: (params: URLSearchParams) => `categoryPath.lvl0:"${params.get('category') ?? ''}"`,
}))

describe('FilterProviders', () => {
  beforeEach(() => {
    refineQuery.mockClear()
    refinePage.mockClear()
    useConfigureMock.mockClear()
  })

  it('ne réinitialise pas la page au montage initial (déjà à 0 par défaut)', () => {
    mockSearchParams = new URLSearchParams('category=Immobilier')
    render(
      <FilterProviders>
        <div />
      </FilterProviders>,
    )
    expect(refinePage).not.toHaveBeenCalled()
  })

  it("réinitialise la page à 0 quand les filtres changent — bascule de section Immobilier -> Mode (bug prod : sinon la page Mode restait sur l'index de page scrollé en Immobilier et Algolia renvoyait des hits vides)", () => {
    mockSearchParams = new URLSearchParams('category=Immobilier')
    const { rerender } = render(
      <FilterProviders>
        <div />
      </FilterProviders>,
    )
    expect(refinePage).not.toHaveBeenCalled()

    mockSearchParams = new URLSearchParams('category=Mode')
    rerender(
      <FilterProviders>
        <div />
      </FilterProviders>,
    )

    expect(refinePage).toHaveBeenCalledTimes(1)
    expect(refinePage).toHaveBeenCalledWith(0)
  })

  it('ne réinitialise pas la page si les filtres sont inchangés (re-render sans changement de section/filtre)', () => {
    mockSearchParams = new URLSearchParams('category=Immobilier')
    const { rerender } = render(
      <FilterProviders>
        <div />
      </FilterProviders>,
    )

    rerender(
      <FilterProviders>
        <div />
      </FilterProviders>,
    )

    expect(refinePage).not.toHaveBeenCalled()
  })

  it('transmet toujours les filtres construits au widget Configure', () => {
    mockSearchParams = new URLSearchParams('category=Mode')
    render(
      <FilterProviders>
        <div />
      </FilterProviders>,
    )
    expect(useConfigureMock).toHaveBeenCalledWith({ filters: 'categoryPath.lvl0:"Mode"' })
  })
})
