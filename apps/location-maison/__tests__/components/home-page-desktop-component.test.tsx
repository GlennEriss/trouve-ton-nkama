import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import HomePageDesktopComponent from '@/components/home-page/HomePageDesktopComponent'

const trackEvent = jest.fn()

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img alt={props.alt} /> }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    { get: (_t, tag) => ({ children, ...props }: any) => React.createElement(tag as string, props, children) },
  ),
  useReducedMotion: () => true,
}))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: {
    CTA_HOME_PUBLISH_CLICK: 'home-publish',
    CTA_HOME_SEARCH_CLICK: 'home-search',
    CTA_HOME_EXPLORE_CLICK: 'home-explore',
  },
  useTrackEvent: () => ({ trackEvent }),
}))
jest.mock('@/components/home-page/Navbar', () => ({ __esModule: true, default: () => <div data-testid="navbar" /> }))
jest.mock('@/components/home-page/HomeHeroSponsoredSwap', () => ({
  __esModule: true,
  default: () => <div data-testid="hero-swap" />,
}))
jest.mock('@/components/home-page/CarouselPropertyType', () => ({ __esModule: true, default: () => <div data-testid="carousel-type" /> }))
jest.mock('@/components/home-page/PropertyByProvince', () => ({ __esModule: true, default: () => <div data-testid="by-province" /> }))
jest.mock('@/components/home-page/FeaturedSection', () => ({ __esModule: true, default: () => <div data-testid="featured" /> }))
jest.mock('@/components/home-page/TrendingSection', () => ({ __esModule: true, default: () => <div data-testid="trending" /> }))
jest.mock('@/components/home-page/RecentSection', () => ({ __esModule: true, default: () => <div data-testid="recent" /> }))

describe('HomePageDesktopComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('assemble toutes les sections de la page d accueil desktop', () => {
    render(<HomePageDesktopComponent />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('hero-swap')).toBeInTheDocument()
    expect(screen.getByTestId('featured')).toBeInTheDocument()
    expect(screen.getByTestId('carousel-type')).toBeInTheDocument()
    expect(screen.getByTestId('trending')).toBeInTheDocument()
    expect(screen.getByTestId('recent')).toBeInTheDocument()
    expect(screen.getByTestId('by-province')).toBeInTheDocument()
    expect(screen.getByText('Explorez maintenant')).toBeInTheDocument()
  })

  it('trace les clics publier/rechercher/explorer', () => {
    render(<HomePageDesktopComponent />)
    fireEvent.click(screen.getByText('Publier une annonce'))
    expect(trackEvent).toHaveBeenCalledWith('home-publish', expect.objectContaining({ source: 'home_desktop_needs_section' }))
    fireEvent.click(screen.getByText('Rechercher une annonce'))
    expect(trackEvent).toHaveBeenCalledWith('home-search', expect.objectContaining({ source: 'home_desktop_needs_section' }))
    fireEvent.click(screen.getByText('Explorez maintenant'))
    expect(trackEvent).toHaveBeenCalledWith('home-explore', expect.objectContaining({ source: 'home_desktop_bottom_section' }))
  })
})
