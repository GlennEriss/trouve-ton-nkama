import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import HomePageMobileComponent from '@/components/home-page/HomePageMobileComponent'

let userState: any
const setSearchText = jest.fn()
const trackEvent = jest.fn()

jest.mock('@/providers/AlgoliaContext', () => ({
  useAlgoliaContext: () => ({ searchText: '', setSearchText }),
}))
jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: userState }) }))
jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: 375, height: 800 }) }))
jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    { get: (_t, tag) => ({ children, ...props }: any) => React.createElement(tag as string, props, children) },
  ),
  useReducedMotion: () => true,
}))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: {
    CTA_SEARCH_SUBMIT_CLICK: 'search-submit',
    CTA_HOME_PUBLISH_CLICK: 'home-publish',
    CTA_HOME_SEARCH_CLICK: 'home-search',
    CTA_HOME_EXPLORE_CLICK: 'home-explore',
  },
  useTrackEvent: () => ({ trackEvent }),
}))
jest.mock('next/form', () => ({
  __esModule: true,
  default: ({ children, onSubmit, action }: any) => (
    <form action={action} onSubmit={(e) => { e.preventDefault(); onSubmit?.(e) }}>
      {children}
    </form>
  ),
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
jest.mock('@trouve-ton-nkama/ui/input', () => ({ Input: (props: any) => <input {...props} /> }))
jest.mock('@/components/home-page/Navbar', () => ({ __esModule: true, default: () => <div data-testid="navbar" /> }))
jest.mock('@/components/home-page/FilterModalHomePage', () => ({ FilterModalHomePage: () => <div data-testid="filter-modal" /> }))
jest.mock('@/components/home-page/PropertyByProvince', () => ({ __esModule: true, default: () => <div data-testid="by-province" /> }))
jest.mock('@/components/home-page/CarouselPropertyType', () => ({ __esModule: true, default: () => <div data-testid="carousel-type" /> }))
jest.mock('@/components/home-page/FeaturedSection', () => ({ __esModule: true, default: () => <div data-testid="featured" /> }))
jest.mock('@/components/home-page/TrendingSection', () => ({ __esModule: true, default: () => <div data-testid="trending" /> }))
jest.mock('@/components/home-page/RecentSection', () => ({ __esModule: true, default: () => <div data-testid="recent" /> }))
jest.mock('@/components/ads/SponsoredSlot', () => ({ __esModule: true, default: () => <div data-testid="sponsored" /> }))
jest.mock('@/lib/ads/config', () => ({ ADSENSE_SLOTS: { footer: 'footer-slot' } }))

describe('HomePageMobileComponent', () => {
  beforeAll(() => {
    class ObserverMock {
      observe = jest.fn()
      unobserve = jest.fn()
      disconnect = jest.fn()
      constructor(_callback: IntersectionObserverCallback) {}
    }
    global.IntersectionObserver = ObserverMock as any
  })
  beforeEach(() => {
    jest.clearAllMocks()
    userState = null
  })

  it('assemble toutes les sections de la page d accueil mobile', () => {
    render(<HomePageMobileComponent />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('filter-modal')).toBeInTheDocument()
    expect(screen.getByTestId('featured')).toBeInTheDocument()
    expect(screen.getByTestId('sponsored')).toBeInTheDocument()
    expect(screen.getByTestId('carousel-type')).toBeInTheDocument()
    expect(screen.getByTestId('trending')).toBeInTheDocument()
    expect(screen.getByTestId('recent')).toBeInTheDocument()
    expect(screen.getByTestId('by-province')).toBeInTheDocument()
    expect(screen.getByText('Explorez')).toBeInTheDocument()
  })

  it('trace la soumission de recherche', () => {
    render(<HomePageMobileComponent />)
    fireEvent.click(screen.getByLabelText('Lancer la recherche'))
    expect(trackEvent).toHaveBeenCalledWith('search-submit', expect.objectContaining({ source: 'home_mobile_search_section' }))
  })

  it('trace les clics publier/rechercher/explorer', () => {
    render(<HomePageMobileComponent />)
    fireEvent.click(screen.getByText('Publier une annonce'))
    expect(trackEvent).toHaveBeenCalledWith('home-publish', expect.objectContaining({ source: 'home_mobile_needs_section' }))
    fireEvent.click(screen.getByText('Rechercher une annonce'))
    expect(trackEvent).toHaveBeenCalledWith('home-search', expect.objectContaining({ source: 'home_mobile_needs_section' }))
    fireEvent.click(screen.getByText('Explorez'))
    expect(trackEvent).toHaveBeenCalledWith('home-explore', expect.objectContaining({ source: 'home_mobile_bottom_section' }))
  })

  it('met a jour le texte de recherche via le champ input', () => {
    render(<HomePageMobileComponent />)
    fireEvent.change(screen.getByPlaceholderText('Logement, ville, quartier...'), { target: { value: 'Libreville' } })
    expect(setSearchText).toHaveBeenCalledWith('Libreville')
  })
})
