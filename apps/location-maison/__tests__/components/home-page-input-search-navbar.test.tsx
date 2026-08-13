import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import InputSearchNavbar from '@/components/home-page/InputSearchNavbar'

const push = jest.fn()
const trackEvent = jest.fn()
const setSearchText = jest.fn()
let windowWidth: number
let algoliaState: Record<string, any>

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: windowWidth, height: 800 }) }))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: { CTA_SEARCH_SUBMIT_CLICK: 'search-submit' },
  useTrackEvent: () => ({ trackEvent }),
}))
jest.mock('@/providers/AlgoliaContext', () => ({ useAlgoliaContext: () => algoliaState }))
jest.mock('@trouve-ton-nkama/ui/input', () => ({ Input: (props: any) => <input {...props} /> }))

function makeAlgoliaState(overrides: Record<string, unknown> = {}) {
  return {
    searchText: '',
    setSearchText,
    city: '',
    street: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    minNbrRooms: '',
    maxNbrRooms: '',
    typeProperty: [],
    tags: [],
    ...overrides,
  }
}

describe('InputSearchNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    algoliaState = makeAlgoliaState()
  })

  it('desktop (>=1280px): recherche directement et trace la source desktop', () => {
    windowWidth = 1280
    algoliaState = makeAlgoliaState({ searchText: 'Libreville' })
    render(<InputSearchNavbar />)
    fireEvent.click(screen.getByLabelText('Lancer la recherche'))
    expect(trackEvent).toHaveBeenCalledWith(
      'search-submit',
      expect.objectContaining({ source: 'home_desktop_navbar', has_query: 1, has_filters: 0 }),
    )
    expect(push).toHaveBeenCalledWith(expect.stringContaining('query=Libreville'))
    expect(push).toHaveBeenCalledWith(expect.stringContaining('searchSource=location_maison_search_bar'))
  })

  it('inclut les filtres actifs dans l URL et le tracking', () => {
    windowWidth = 1280
    algoliaState = makeAlgoliaState({ city: 'Libreville', typeProperty: ['Home'], tags: ['piscine'] })
    render(<InputSearchNavbar />)
    fireEvent.click(screen.getByLabelText('Lancer la recherche'))
    expect(trackEvent).toHaveBeenCalledWith('search-submit', expect.objectContaining({ has_filters: 1 }))
    expect(push).toHaveBeenCalledWith(expect.stringContaining('city=Libreville'))
    expect(push).toHaveBeenCalledWith(expect.stringContaining('typeProperty=Home'))
    expect(push).toHaveBeenCalledWith(expect.stringContaining('tags=piscine'))
  })

  it('tablette (<1280, >=768): un clic sur l icone ouvre la barre de recherche', () => {
    windowWidth = 1024
    render(<InputSearchNavbar />)
    expect(screen.queryByPlaceholderText('Rechercher une annonce...')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Ouvrir la recherche'))
    expect(screen.getByPlaceholderText('Rechercher une annonce...')).toBeInTheDocument()
  })

  it('tablette: la touche Entree dans la barre ouverte lance la recherche', () => {
    windowWidth = 1024
    render(<InputSearchNavbar />)
    fireEvent.click(screen.getByLabelText('Ouvrir la recherche'))
    fireEvent.keyDown(screen.getByPlaceholderText('Rechercher une annonce...'), { key: 'Enter' })
    expect(push).toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('search-submit', expect.objectContaining({ source: 'home_desktop_navbar' }))
  })

  it('mobile (<768): un clic sur l icone fait defiler vers le formulaire de recherche', () => {
    windowWidth = 375
    const form = document.createElement('form')
    form.setAttribute('action', '/search')
    form.scrollIntoView = jest.fn()
    document.body.appendChild(form)

    render(<InputSearchNavbar />)
    fireEvent.click(screen.getByLabelText('Ouvrir la recherche'))

    expect(form.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(screen.queryByPlaceholderText('Rechercher une annonce...')).not.toBeInTheDocument()

    document.body.removeChild(form)
  })

  it('mobile: ne plante pas quand aucun formulaire de recherche n est present', () => {
    windowWidth = 375
    render(<InputSearchNavbar />)
    expect(() => fireEvent.click(screen.getByLabelText('Ouvrir la recherche'))).not.toThrow()
  })
})
