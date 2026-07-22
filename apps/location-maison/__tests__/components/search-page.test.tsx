import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import SearchPage from '@/components/search/SearchPage'

const configureMock = jest.fn()
const refineMock = jest.fn()
const showMoreMock = jest.fn()
const setters: Record<string, jest.Mock> = {}

let params: URLSearchParams
let contextState: Record<string, any>
let hitsState: Record<string, any>
let observerCallback: IntersectionObserverCallback

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => params.get(key), toString: () => params.toString() }),
}))
jest.mock('react-instantsearch', () => ({
  useConfigure: (options: unknown) => configureMock(options),
  useSearchBox: () => ({ refine: refineMock }),
  useInfiniteHits: () => hitsState,
}))
jest.mock('@/providers/AlgoliaContext', () => ({ useAlgoliaContext: () => contextState }))
jest.mock('@/components/home-page/PropertyCard', () => ({
  __esModule: true,
  default: ({ property }: any) => <article>Annonce {property.objectID}</article>,
}))
jest.mock('@/components/home-page/FilterModal', () => ({ FilterModal: () => <button>Filtres avancés</button> }))
jest.mock('@/constantes/property-type', () => ({ TypeProperty: { home: 'Maison', land: 'Terrain' } }))
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

function buildContext(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    searchText: 'villa', province: 'Estuaire', city: 'Libreville', street: 'Akebe',
    minPrice: '100000', maxPrice: '500000', minArea: '50', maxArea: '200',
    minNbrRooms: '2', maxNbrRooms: '5', typeProperty: ['home', 'land'],
    status: ['rent'], tags: ['climatisé', 'parking'],
  }
  Object.keys(values).forEach((key) => {
    setters[`set${key[0].toUpperCase()}${key.slice(1)}`] ??= jest.fn()
  })
  return { ...values, ...setters, ...overrides }
}

describe('SearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    params = new URLSearchParams('query=villa&province=Estuaire&city=Libreville&street=Akebe&minPrice=100000&maxPrice=500000&minArea=50&maxArea=200&minNbrRooms=2&maxNbrRooms=5&typeProperty=home,land&status=rent,sale&tags=climatise,parking')
    contextState = buildContext()
    hitsState = { items: [], isLastPage: true, showMore: showMoreMock }
    observerCallback = jest.fn() as any
    class ObserverMock {
      observe = jest.fn()
      disconnect = jest.fn()
      constructor(callback: IntersectionObserverCallback) { observerCallback = callback }
    }
    global.IntersectionObserver = ObserverMock as any
    Element.prototype.scrollIntoView = jest.fn()
  })

  afterEach(() => jest.useRealTimers())

  it('construit tous les filtres Algolia depuis l URL et initialise le contexte', () => {
    render(<SearchPage />)
    expect(configureMock).toHaveBeenCalledWith({ filters: expect.stringContaining('state:"IN_PROGRESS"') })
    const filters = configureMock.mock.calls.at(-1)![0].filters
    expect(filters).toContain('province:"Estuaire"')
    expect(filters).toContain('price >= 100000')
    expect(filters).toContain('(typeProperty:"home" OR typeProperty:"land")')
    expect(filters).toContain('(status:"rent" OR status:"sale")')
    expect(filters).toContain('(tags:"climatise" OR tags:"parking")')
    expect(refineMock).toHaveBeenCalledWith('villa')

    jest.advanceTimersByTime(50)
    expect(setters.setSearchText).toHaveBeenCalledWith('villa')
    expect(setters.setTypeProperty).toHaveBeenCalledWith(['home', 'land'])
    expect(setters.setStatus).toHaveBeenCalledWith(['rent', 'sale'])
    expect(setters.setTags).toHaveBeenCalledWith(['climatise', 'parking'])
  })

  it('retire chaque catégorie de filtre et sait tout réinitialiser', () => {
    render(<SearchPage />)
    ;['Recherche : villa', 'Province : Estuaire', 'Ville : Libreville', 'Quartier : Akebe', 'Prix : 100000 – 500000', 'Surface : 50 – 200 m²', 'Chambres : 2 – 5', 'Maison', 'climatisé'].forEach((label) => {
      fireEvent.click(screen.getByText(label).parentElement!.querySelector('button')!)
    })
    expect(setters.setSearchText).toHaveBeenCalledWith('')
    expect(setters.setProvince).toHaveBeenCalledWith('')
    expect(setters.setMinPrice).toHaveBeenCalledWith('')
    expect(setters.setMaxPrice).toHaveBeenCalledWith('')
    expect(setters.setTypeProperty).toHaveBeenCalledWith(['land'])
    expect(setters.setTags).toHaveBeenCalledWith(['parking'])

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }))
    expect(setters.setCity).toHaveBeenCalledWith('')
    expect(setters.setTypeProperty).toHaveBeenCalledWith([])
    expect(setters.setTags).toHaveBeenCalledWith([])
  })

  it('affiche les annonces, charge la suite et réagit à l intersection', () => {
    hitsState = { items: [{ objectID: 'p1' }, { objectID: 'p2' }], isLastPage: false, showMore: showMoreMock }
    render(<SearchPage />)
    expect(screen.getByText('Annonce p1')).toBeVisible()
    expect(screen.getByText('Annonce p2')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Voir plus' }))
    expect(showMoreMock).toHaveBeenCalledTimes(1)
    observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    expect(showMoreMock).toHaveBeenCalledTimes(2)
  })

  it('ne charge pas à l intersection de fin de liste et gère les raccourcis de défilement', () => {
    hitsState = { items: [{ objectID: 'p1' }], isLastPage: true, showMore: showMoreMock }
    render(<SearchPage />)
    observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    expect(showMoreMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Aller en haut' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aller en bas' }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it('conserve uniquement les filtres obligatoires avec une URL vide', () => {
    params = new URLSearchParams()
    contextState = buildContext({
      searchText: '', province: '', city: '', street: '', minPrice: '', maxPrice: '',
      minArea: '', maxArea: '', minNbrRooms: '', maxNbrRooms: '', typeProperty: [], tags: [], status: [],
    })
    render(<SearchPage />)
    expect(configureMock).toHaveBeenCalledWith({ filters: 'state:"IN_PROGRESS" AND moderationStatus:"APPROVED"' })
    expect(screen.getByText('Aucun bien ne correspond à ces critères.')).toBeVisible()
  })
})
