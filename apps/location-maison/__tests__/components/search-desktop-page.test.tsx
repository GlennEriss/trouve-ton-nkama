import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import SearchDesktopPage from '@/components/search/SearchDesktopPage'

let infiniteHitsState: any
let statsState: any
let instantSearchState: any
let searchParamsMap: Map<string, string>
const setters = {
  setProvince: jest.fn(),
  setCity: jest.fn(),
  setStreet: jest.fn(),
  setMinPrice: jest.fn(),
  setMaxPrice: jest.fn(),
  setMinArea: jest.fn(),
  setMaxArea: jest.fn(),
  setMinNbrRooms: jest.fn(),
  setMaxNbrRooms: jest.fn(),
  setTypeProperty: jest.fn(),
  setStatus: jest.fn(),
  setTags: jest.fn(),
  clearFilters: jest.fn(),
}
let provincesState: any[]

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img alt={props.alt} /> }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsMap.get(key) ?? null,
    toString: () => Array.from(searchParamsMap.entries()).map(([k, v]) => `${k}=${v}`).join('&'),
  }),
}))
jest.mock('react-instantsearch', () => ({
  useInfiniteHits: () => infiniteHitsState,
  useStats: () => statsState,
  useInstantSearch: () => instantSearchState,
}))
jest.mock('@/hooks/use-location-exports', () => ({ useProvinces: () => ({ data: provincesState }) }))
jest.mock('@/providers/AlgoliaContext', () => ({ useAlgoliaContext: () => setters }))
jest.mock('@/features/analytics/search/hooks/useTrackSearchAnalytics', () => ({ useTrackSearchAnalytics: jest.fn() }))
jest.mock('@/components/home-page/PropertyCard', () => ({
  __esModule: true,
  default: ({ property }: any) => <div data-testid="property-card">{property.objectID}</div>,
}))
jest.mock('@/components/search/FilterSearchDesktopPageSection', () => ({
  __esModule: true,
  default: () => <div data-testid="filter-section" />,
}))
jest.mock('@/components/search/CategoryFilterPills', () => ({
  __esModule: true,
  default: () => <div data-testid="category-filter-pills" />,
  DEMANDES_CATEGORY_NAME: 'Demandes',
}))
jest.mock('@/components/search/CategoryLeafFilterPills', () => ({
  __esModule: true,
  default: () => <div data-testid="category-leaf-filter-pills" />,
}))
jest.mock('@/components/search-requests/SearchRequestsListClient', () => ({
  __esModule: true,
  default: () => <div data-testid="search-requests-list" />,
}))
jest.mock('@/components/ads/SponsoredSlot', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="sponsored-slot">{props.rotationIndex}</div>,
}))
jest.mock('@/lib/ads/config', () => ({ ADSENSE_SLOTS: { searchInline: 'search-inline-slot' } }))

function makeItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({ objectID: `p${i}` }))
}

describe('SearchDesktopPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    class ObserverMock {
      observe = jest.fn()
      disconnect = jest.fn()
      constructor(_cb: IntersectionObserverCallback) {}
    }
    global.IntersectionObserver = ObserverMock as any
    searchParamsMap = new Map()
    provincesState = [{ id: 'estuaire', name: 'Estuaire' }]
    infiniteHitsState = { items: [], isLastPage: true, showMore: jest.fn() }
    statsState = { nbHits: 0 }
    instantSearchState = { status: 'idle', refresh: jest.fn() }
  })

  it('affiche le panneau de filtres', () => {
    render(<SearchDesktopPage />)
    expect(screen.getByTestId('filter-section')).toBeInTheDocument()
  })

  it('affiche un etat d erreur avec bouton reessayer', () => {
    instantSearchState = { status: 'error', refresh: jest.fn() }
    render(<SearchDesktopPage />)
    expect(screen.getByText('La recherche est momentanément indisponible.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Réessayer'))
    expect(instantSearchState.refresh).toHaveBeenCalled()
  })

  it('affiche un etat de chargement pendant la recherche', () => {
    instantSearchState = { status: 'loading', refresh: jest.fn() }
    render(<SearchDesktopPage />)
    expect(screen.getByText('Recherche des annonces...')).toBeInTheDocument()
  })

  it('affiche un etat vide et reinitialise les filtres au clic', () => {
    render(<SearchDesktopPage />)
    expect(screen.getByText('Aucun bien ne correspond à ces critères.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Réinitialiser les filtres'))
    expect(setters.clearFilters).toHaveBeenCalled()
  })

  it('affiche les resultats et le nombre d annonces trouvees', () => {
    infiniteHitsState = { items: makeItems(3), isLastPage: true, showMore: jest.fn() }
    statsState = { nbHits: 3 }
    render(<SearchDesktopPage />)
    expect(screen.getByText('3 annonces trouvées')).toBeInTheDocument()
    expect(screen.getAllByTestId('property-card')).toHaveLength(3)
  })

  it('accorde le singulier pour une seule annonce', () => {
    infiniteHitsState = { items: makeItems(1), isLastPage: true, showMore: jest.fn() }
    statsState = { nbHits: 1 }
    render(<SearchDesktopPage />)
    expect(screen.getByText('1 annonce trouvée')).toBeInTheDocument()
  })

  it('insere un emplacement publicitaire apres la 8e annonce', () => {
    infiniteHitsState = { items: makeItems(9), isLastPage: true, showMore: jest.fn() }
    statsState = { nbHits: 9 }
    render(<SearchDesktopPage />)
    expect(screen.getAllByTestId('property-card')).toHaveLength(9)
    expect(screen.getAllByTestId('sponsored-slot')).toHaveLength(1)
  })

  it('affiche l invite de defilement quand il reste des pages', () => {
    infiniteHitsState = { items: makeItems(2), isLastPage: false, showMore: jest.fn() }
    statsState = { nbHits: 2 }
    render(<SearchDesktopPage />)
    expect(screen.getByText("Défilez vers le bas pour charger plus d'annonces")).toBeInTheDocument()
  })

  it('synchronise l URL vers le contexte Algolia une fois les provinces chargees', () => {
    searchParamsMap.set('province', 'Estuaire')
    searchParamsMap.set('typeProperty', 'Home,Studio')
    render(<SearchDesktopPage />)
    expect(setters.setProvince).toHaveBeenCalledWith('Estuaire')
    expect(setters.setTypeProperty).toHaveBeenCalledWith(['Home', 'Studio'])
  })

  it('ne synchronise pas tant que les provinces ne sont pas chargees', () => {
    provincesState = []
    render(<SearchDesktopPage />)
    expect(setters.setProvince).not.toHaveBeenCalled()
  })

  it('bascule vers SearchRequestsListClient quand category=Demandes, sans le panneau de filtres immobilier', () => {
    // Une demande de recherche (collection Firestore search_requests) n'est jamais indexee
    // dans Algolia : items/nbHits ne la concernent pas, et son propre filtre integre rend le
    // panneau FilterSearchDesktopPageSection (province/prix/surface immobilier) hors-sujet.
    searchParamsMap.set('category', 'Demandes')
    render(<SearchDesktopPage />)

    expect(screen.getByTestId('search-requests-list')).toBeInTheDocument()
    expect(screen.getByTestId('category-filter-pills')).toBeInTheDocument()
    expect(screen.queryByTestId('filter-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('category-leaf-filter-pills')).not.toBeInTheDocument()
    expect(screen.queryByTestId('property-card')).not.toBeInTheDocument()
  })
})
