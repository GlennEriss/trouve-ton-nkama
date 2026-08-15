import React from 'react'
import { render, screen } from '@testing-library/react'

import ListingCardsCarousel from '@/components/listing/ListingCardsCarousel'

jest.mock('@/components/listing/ListingCard', () => ({
  __esModule: true,
  default: ({ property, density, hideDate }: any) => (
    <div data-testid="listing-card" data-density={density} data-hide-date={String(Boolean(hideDate))}>
      {property.title}
    </div>
  ),
}))
jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: 1280, height: 800 }) }))
jest.mock('react-slick', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="slider">{children}</div>,
}))

describe('ListingCardsCarousel', () => {
  it('ne rend rien quand la liste est vide', () => {
    const { container } = render(<ListingCardsCarousel items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('rend une seule carte sans slider quand il n y a qu un item', () => {
    render(<ListingCardsCarousel items={[{ id: 'p1', title: 'Annonce unique' }]} />)
    const cards = screen.getAllByTestId('listing-card')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent('Annonce unique')
    expect(cards[0]).toHaveAttribute('data-density', 'compact')
  })

  it('rend un slider (react-slick) avec toutes les cartes quand il y a plusieurs items', () => {
    render(
      <ListingCardsCarousel
        items={[
          { id: 'p1', title: 'Annonce 1' },
          { id: 'p2', title: 'Annonce 2' },
          { id: 'p3', title: 'Annonce 3' },
        ]}
        hideDate
      />,
    )
    const cards = screen.getAllByTestId('listing-card')
    expect(cards).toHaveLength(3)
    expect(cards.every((card) => card.getAttribute('data-hide-date') === 'true')).toBe(true)
  })
})
