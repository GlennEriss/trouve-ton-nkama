import React from 'react'
import { render, screen } from '@testing-library/react'

import RecentSection from '@/components/home-page/RecentSection'
import FeaturedSection from '@/components/home-page/FeaturedSection'
import TrendingSection from '@/components/home-page/TrendingSection'

let infiniteQueryState: any
let promotedState: any

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img alt={props.alt} /> }))
jest.mock('@/components/property/PropertyCarousel', () => ({
  __esModule: true,
  default: ({ properties, hideDate }: any) => (
    <div data-testid="carousel" data-hide-date={String(Boolean(hideDate))}>
      {properties.length} annonces
    </div>
  ),
}))
jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => infiniteQueryState,
}))
jest.mock('@/hooks/use-promoted-properties', () => ({
  usePromotedProperties: (filter: string) => promotedState(filter),
}))

describe('RecentSection', () => {
  it('affiche le carousel avec la premiere page de resultats', () => {
    infiniteQueryState = { data: { pages: [{ properties: [{ id: 'p1' }, { id: 'p2' }] }] } }
    render(<RecentSection />)
    expect(screen.getByText('Annonces récentes')).toBeInTheDocument()
    expect(screen.getByTestId('carousel')).toHaveTextContent('2 annonces')
  })

  it('affiche un carousel vide avant le premier chargement', () => {
    infiniteQueryState = { data: undefined }
    render(<RecentSection />)
    expect(screen.getByTestId('carousel')).toHaveTextContent('0 annonces')
  })
})

describe('FeaturedSection', () => {
  it('ne rend rien quand aucune annonce a la une n est chargee', () => {
    promotedState = () => ({ featuredProperties: [], isLoading: false })
    const { container } = render(<FeaturedSection />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reste affiche pendant le chargement meme sans donnees', () => {
    promotedState = () => ({ featuredProperties: [], isLoading: true })
    render(<FeaturedSection />)
    expect(screen.getByText('À la une')).toBeInTheDocument()
  })

  it('affiche les annonces a la une et filtre celles sans id', () => {
    promotedState = () => ({ featuredProperties: [{ id: 'p1' }, { id: null }], isLoading: false })
    render(<FeaturedSection />)
    expect(screen.getByTestId('carousel')).toHaveTextContent('1 annonces')
  })
})

describe('TrendingSection', () => {
  it('ne rend rien quand aucune tendance n est chargee', () => {
    promotedState = () => ({ trendingProperties: [], isLoading: false })
    const { container } = render(<TrendingSection />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche les annonces en tendance sans date', () => {
    promotedState = () => ({ trendingProperties: [{ id: 'p1' }], isLoading: false })
    render(<TrendingSection />)
    expect(screen.getByText('En tendance')).toBeInTheDocument()
    expect(screen.getByTestId('carousel')).toHaveAttribute('data-hide-date', 'true')
  })
})
