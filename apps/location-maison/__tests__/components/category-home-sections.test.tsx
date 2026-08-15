import React from 'react'
import { render, screen } from '@testing-library/react'

import CategoryHomeSections from '@/components/home-page/CategoryHomeSections'

let queryState: any

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => queryState,
}))
jest.mock('@/components/listing/ListingCardsCarousel', () => ({
  __esModule: true,
  default: ({ items, hideDate }: any) => (
    <div data-testid="carousel" data-hide-date={String(Boolean(hideDate))}>
      {items.length} items
    </div>
  ),
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

describe('CategoryHomeSections', () => {
  it("ne rend rien tant qu'aucune section n'est disponible", () => {
    queryState = { data: [] }
    const { container } = render(<CategoryHomeSections />)
    expect(container).toBeEmptyDOMElement()
  })

  it('rend une section par catégorie avec son carrousel et son lien "Voir tout"', () => {
    queryState = {
      data: [
        { id: 'immobilier', slug: 'immobilier', name: 'Immobilier', items: [{ id: 'p1' }, { id: 'p2' }] },
        { id: 'mode', slug: 'mode', name: 'Mode', items: [{ id: 'm1' }] },
      ],
    }
    render(<CategoryHomeSections />)

    expect(screen.getByText('Immobilier')).toBeInTheDocument()
    expect(screen.getByText('Mode')).toBeInTheDocument()

    const carousels = screen.getAllByTestId('carousel')
    expect(carousels).toHaveLength(2)
    expect(carousels[0]).toHaveTextContent('2 items')
    expect(carousels[0]).toHaveAttribute('data-hide-date', 'true')
    expect(carousels[1]).toHaveTextContent('1 items')

    expect(screen.getAllByText('Voir tout')[0]).toHaveAttribute('href', '/search?category=Immobilier')
    expect(screen.getAllByText('Voir tout')[1]).toHaveAttribute('href', '/search?category=Mode')
  })
})
