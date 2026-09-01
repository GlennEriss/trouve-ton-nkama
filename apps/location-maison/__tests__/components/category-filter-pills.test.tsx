import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import CategoryFilterPills from '@/components/search/CategoryFilterPills'

const push = jest.fn()
let searchParamsString = ''

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      { id: 'immobilier', slug: 'immobilier', name: 'Immobilier', icon: null, order: 0 },
      { id: 'mode', slug: 'mode', name: 'Mode', icon: null, order: 10 },
    ],
  }),
}))

describe('CategoryFilterPills', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchParamsString = ''
  })

  it('affiche les pastilles quand au moins 2 categories racine sont actives', () => {
    render(<CategoryFilterPills />)
    expect(screen.getByText('Toutes catégories')).toBeInTheDocument()
    expect(screen.getByText('Immobilier')).toBeInTheDocument()
    expect(screen.getByText('Mode')).toBeInTheDocument()
  })

  it('purge categoryId, attr_*, et les filtres immobilier-only en changeant de racine', () => {
    // Bug reel trouve en adaptant les filtres /search a Mode : sans cette purge, un filtre
    // immobilier-only laisse dans l'URL (ex. minArea, typeProperty) continuait de s'appliquer
    // a une recherche Mode alors que son controle avait disparu de l'UI (FilterSearchDesktopPageSection/
    // FilterModalHomePage) — resultats vides sans aucune explication visible.
    searchParamsString =
      'categoryId=leaf-1&attr_taille=M&province=Estuaire&street=Glass&status=FOR_SALE' +
      '&minArea=10&maxArea=50&typeProperty=Villa&city=Libreville&query=test'
    render(<CategoryFilterPills />)

    fireEvent.click(screen.getByText('Mode'))

    expect(push).toHaveBeenCalledTimes(1)
    const url = new URL(push.mock.calls[0][0] as string, 'http://localhost')
    const params = url.searchParams

    expect(params.get('category')).toBe('Mode')
    expect(params.has('categoryId')).toBe(false)
    expect(params.has('attr_taille')).toBe(false)
    expect(params.has('province')).toBe(false)
    expect(params.has('street')).toBe(false)
    expect(params.has('status')).toBe(false)
    expect(params.has('minArea')).toBe(false)
    expect(params.has('maxArea')).toBe(false)
    expect(params.has('typeProperty')).toBe(false)
    // Génériques, sans rapport avec l'immobilier : doivent survivre au changement de racine.
    expect(params.get('city')).toBe('Libreville')
    expect(params.get('query')).toBe('test')
  })

  it('efface le parametre category en revenant sur "Toutes categories"', () => {
    searchParamsString = 'category=Mode&categoryId=leaf-1'
    render(<CategoryFilterPills />)

    fireEvent.click(screen.getByText('Toutes catégories'))

    const url = new URL(push.mock.calls[0][0] as string, 'http://localhost')
    expect(url.searchParams.has('category')).toBe(false)
    expect(url.searchParams.has('categoryId')).toBe(false)
  })
})
