import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'

import SearchMobilePage from '@/components/search/SearchMobilePage'

const pushMock = jest.fn()
const showMoreMock = jest.fn()
const refreshMock = jest.fn()
const trackMock = jest.fn()
const analyticsMock = jest.fn()
const setters: Record<string, jest.Mock> = {}

let params: URLSearchParams
let contextState: Record<string, any>
let hitsState: Record<string, any>
let instantStatus: string
let sessionStatus: string
let observerCallback: IntersectionObserverCallback

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: (key: string) => params.get(key), toString: () => params.toString() }),
}))
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: sessionStatus }) }))
jest.mock('react-instantsearch', () => ({
  useInfiniteHits: () => hitsState,
  useStats: () => ({ nbHits: hitsState.items.length }),
  useInstantSearch: () => ({ status: instantStatus, refresh: refreshMock }),
}))
jest.mock('@/providers/AlgoliaContext', () => ({ useAlgoliaContext: () => contextState }))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: { CTA_SEARCH_WITH_IA_ENTRY_CLICK: 'ai-click', CTA_SEARCH_SUBMIT_CLICK: 'search-click' },
  useTrackEvent: () => ({ trackEvent: trackMock }),
}))
jest.mock('@/features/analytics/search/hooks/useTrackSearchAnalytics', () => ({
  useTrackSearchAnalytics: (value: unknown) => analyticsMock(value),
}))
jest.mock('next/form', () => ({ __esModule: true, default: ({ children, ...props }: any) => <form {...props}>{children}</form> }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a> }))
jest.mock('@trouve-ton-nkama/ui/input', () => ({ Input: (props: any) => <input {...props} /> }))
jest.mock('@/components/home-page/FilterModalHomePage', () => ({ FilterModalHomePage: () => <span>Filtres</span> }))
jest.mock('@/components/home-page/PropertyCard', () => ({ __esModule: true, default: ({ property }: any) => <article>Annonce {property.objectID}</article> }))
jest.mock('@/components/ads/SponsoredSlot', () => ({ __esModule: true, default: ({ rotationIndex }: any) => <aside>Publicité {rotationIndex}</aside> }))
jest.mock('@/components/search/SearchWithAIAccessNoticeDialog', () => ({
  __esModule: true,
  default: ({ open, onOpenChange }: any) => open ? <div>Connexion IA <button onClick={() => onOpenChange(false)}>Fermer accès</button></div> : null,
}))

function buildContext(overrides: Record<string, unknown> = {}) {
  const values: Record<string, any> = {
    searchText: 'villa', province: 'Estuaire', city: 'Libreville', street: 'Akebe',
    minPrice: '100000', maxPrice: '500000', minArea: '50', maxArea: '200',
    minNbrRooms: '2', maxNbrRooms: '5', typeProperty: ['home', 'land'], tags: ['parking'],
  }
  Object.keys({ ...values, status: [] }).forEach((key) => {
    setters[`set${key[0].toUpperCase()}${key.slice(1)}`] ??= jest.fn()
  })
  return { ...values, ...setters, ...overrides }
}

describe('SearchMobilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    params = new URLSearchParams('query=villa&province=Estuaire&city=Libreville&street=Akebe&minPrice=100000&maxPrice=500000&minArea=50&maxArea=200&minNbrRooms=2&maxNbrRooms=5&typeProperty=home,land&status=rent&tags=parking')
    contextState = buildContext()
    hitsState = { items: [], isLastPage: true, showMore: showMoreMock }
    instantStatus = 'idle'
    sessionStatus = 'unauthenticated'
    class ObserverMock {
      observe = jest.fn()
      disconnect = jest.fn()
      constructor(callback: IntersectionObserverCallback) { observerCallback = callback }
    }
    global.IntersectionObserver = ObserverMock as any
    Element.prototype.scrollIntoView = jest.fn()
  })

  afterEach(() => jest.useRealTimers())

  it('synchronise l URL, soumet tous les filtres et protège le CTA IA visiteur', () => {
    render(<SearchMobilePage />)
    expect(setters.setTypeProperty).toHaveBeenCalledWith(['home', 'land'])
    expect(setters.setStatus).toHaveBeenCalledWith(['rent'])
    expect(setters.setTags).toHaveBeenCalledWith(['parking'])
    fireEvent.click(screen.getByRole('button', { name: 'Lancer la recherche' }))
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('typeProperty=home%2Cland'))
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('tags=parking'))
    expect(trackMock).toHaveBeenCalledWith('search-click', expect.objectContaining({ has_query: 1, has_filters: 1 }))

    const aiLink = screen.getByRole('link', { name: 'Rechercher avec IA' })
    expect(aiLink).toHaveAttribute('href', expect.stringContaining('entry=search_cta'))
    fireEvent.click(aiLink)
    expect(screen.getByText('Connexion IA')).toBeVisible()
    expect(trackMock).toHaveBeenCalledWith('ai-click', expect.objectContaining({ is_authenticated: 0 }))
    fireEvent.click(screen.getByRole('button', { name: 'Fermer accès' }))
    expect(screen.queryByText('Connexion IA')).not.toBeInTheDocument()
  })

  it('laisse un membre ouvrir la recherche IA et accepte une recherche vide', () => {
    sessionStatus = 'authenticated'
    params = new URLSearchParams()
    contextState = buildContext({ searchText: '', province: '', city: '', street: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '', minNbrRooms: '', maxNbrRooms: '', typeProperty: [], tags: [] })
    render(<SearchMobilePage />)
    fireEvent.change(screen.getByPlaceholderText('Logement, ville, quartier...'), { target: { value: 'terrain' } })
    expect(setters.setSearchText).toHaveBeenCalledWith('terrain')
    fireEvent.click(screen.getByRole('button', { name: 'Lancer la recherche' }))
    expect(pushMock).toHaveBeenCalledWith('/search?')
    fireEvent.click(screen.getByRole('link', { name: 'Rechercher avec IA' }))
    expect(screen.queryByText('Connexion IA')).not.toBeInTheDocument()
  })

  it('rend les états erreur, chargement et vide', () => {
    instantStatus = 'error'
    const { rerender } = render(<SearchMobilePage />)
    expect(screen.getByRole('alert')).toHaveTextContent('momentanément indisponible')
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(refreshMock).toHaveBeenCalled()

    instantStatus = 'stalled'
    rerender(<SearchMobilePage />)
    expect(screen.getByRole('status')).toHaveTextContent('Recherche des annonces')
    instantStatus = 'idle'
    rerender(<SearchMobilePage />)
    expect(screen.getByText('Aucun résultat trouvé')).toBeVisible()
  })

  it('insère les publicités et charge automatiquement la page suivante', () => {
    hitsState = { items: Array.from({ length: 17 }, (_, index) => ({ objectID: `p${index}` })), isLastPage: false, showMore: showMoreMock }
    const { rerender } = render(<SearchMobilePage />)
    expect(screen.getAllByText(/Annonce p/)).toHaveLength(17)
    expect(screen.getByText('Publicité 0')).toBeVisible()
    expect(screen.getByText('Publicité 1')).toBeVisible()
    expect(screen.getByText("Défilez vers le bas pour charger plus d'annonces")).toBeVisible()

    act(() => observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(showMoreMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Chargement des annonces...')).toBeVisible()
    hitsState = { ...hitsState, items: [...hitsState.items, { objectID: 'p17' }, { objectID: 'p18' }] }
    rerender(<SearchMobilePage />)
    expect(screen.getByText('+2 nouvelles annonces ajoutées')).toBeVisible()
    act(() => jest.advanceTimersByTime(1800))
    expect(screen.queryByText('+2 nouvelles annonces ajoutées')).not.toBeInTheDocument()
  })

  it('arrête un chargement sans nouvelles annonces et gère le défilement', () => {
    hitsState = { items: [{ objectID: 'p1' }], isLastPage: false, showMore: showMoreMock }
    render(<SearchMobilePage />)
    act(() => observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(screen.getByText('Chargement des annonces...')).toBeVisible()
    act(() => jest.advanceTimersByTime(5000))
    expect(screen.getByText("Défilez vers le bas pour charger plus d'annonces")).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Aller en haut' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aller en bas' }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2)
  })
})
