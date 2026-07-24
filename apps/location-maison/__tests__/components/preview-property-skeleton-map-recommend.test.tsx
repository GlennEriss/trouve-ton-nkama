import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

import HouseDetailSkeleton from '@/components/preview-property/HouseDetailSkeleton'
import { MapSection } from '@/components/preview-property/MapSection'
import RecommendationSection from '@/components/preview-property/RecommendationSection'

let windowSize: { width: number; height: number }
let recommendState: { properties: any[]; loading: boolean; error: unknown }

jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => windowSize }))
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: (props: any) => <div data-testid="skeleton" {...props} /> }))
jest.mock('next/dynamic', () => () => (props: any) => <div data-testid="simple-map">{JSON.stringify(props)}</div>)
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img alt={props.alt} /> }))
jest.mock('@/components/property/PropertyCarousel', () => ({
  __esModule: true,
  default: ({ properties }: any) => <div data-testid="carousel">{properties.length} annonces</div>,
}))
jest.mock('@/hooks/use-recommend', () => ({ useRecommend: () => recommendState }))

describe('HouseDetailSkeleton', () => {
  it('affiche la variante mobile en dessous de 768px', () => {
    windowSize = { width: 375, height: 800 }
    render(<HouseDetailSkeleton />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('affiche la variante desktop a partir de 768px', () => {
    windowSize = { width: 1280, height: 900 }
    render(<HouseDetailSkeleton />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })
})

describe('MapSection', () => {
  it('affiche un placeholder avant le montage puis la vraie carte apres', async () => {
    render(
      <MapSection
        street="Nkembo"
        city="Libreville"
        province="Estuaire"
        longitude={9.45}
        latitude={0.39}
        countryCode="GA"
      />,
    )
    await waitFor(() => expect(screen.getByTestId('simple-map')).toBeInTheDocument())
    expect(screen.getByTestId('simple-map')).toHaveTextContent('Nkembo')
  })
})

describe('RecommendationSection', () => {
  it('ne rend rien pendant le chargement', () => {
    recommendState = { properties: [], loading: true, error: null }
    const { container } = render(
      <RecommendationSection currentPropertyId="p1" currentPropertyType="maison" currentPropertyLocation="Libreville" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('ne rend rien en cas d erreur', () => {
    recommendState = { properties: [], loading: false, error: new Error('boom') }
    const { container } = render(
      <RecommendationSection currentPropertyId="p1" currentPropertyType="maison" currentPropertyLocation="Libreville" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('ne rend rien quand aucune annonce similaire n est trouvee', () => {
    recommendState = { properties: [], loading: false, error: null }
    const { container } = render(
      <RecommendationSection currentPropertyId="p1" currentPropertyType="maison" currentPropertyLocation="Libreville" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le carousel de recommandations quand des annonces existent', () => {
    recommendState = { properties: [{ id: 'p2' }, { id: 'p3' }], loading: false, error: null }
    render(
      <RecommendationSection currentPropertyId="p1" currentPropertyType="maison" currentPropertyLocation="Libreville" />,
    )
    expect(screen.getByText('Annonces similaires')).toBeInTheDocument()
    expect(screen.getByTestId('carousel')).toHaveTextContent('2 annonces')
  })
})
