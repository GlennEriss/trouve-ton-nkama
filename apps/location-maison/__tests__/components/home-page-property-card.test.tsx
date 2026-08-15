import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import PropertyCard from '@/components/home-page/PropertyCard'

const push = jest.fn()
const trackEvent = jest.fn()
const logImageFallback = jest.fn()
const logImageLoad = jest.fn()
const logImageError = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/search-property' }))
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, onLoad, onError, src }: any) => (
    <img
      alt={alt}
      data-src={src}
      onLoad={onLoad}
      onError={() => onError({ currentTarget: { currentSrc: '', src: '' } })}
    />
  ),
}))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: { CTA_PROPERTY_CARD_CLICK: 'card-click' },
  useTrackEvent: () => ({ trackEvent }),
}))
jest.mock('@/lib/image-debug', () => ({
  logImageError: (...args: unknown[]) => logImageError(...args),
  logImageFallback: (...args: unknown[]) => logImageFallback(...args),
  logImageLoad: (...args: unknown[]) => logImageLoad(...args),
}))
jest.mock('@/lib/property-images', () => ({
  resolveThumbnailUrl: (image: any) => (image ? `https://cdn/${typeof image === 'string' ? image : image.fileURL}` : undefined),
}))
jest.mock('@/components/preview-property/ButtonFavoris', () => ({ ButtonFavoris: () => <div data-testid="favoris" /> }))

function baseProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    title: 'Villa a Nkembo',
    price: 250000,
    status: 'FOR_RENT',
    typeProperty: 'Home',
    city: 'Libreville',
    province: 'Estuaire',
    street: 'Nkembo',
    area: 120,
    nbrRooms: 3,
    nbrBathrooms: 2,
    images: ['photo.jpg'],
    createdAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('PropertyCard', () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn(async () => ({ ok: false })) as any
  })
  afterAll(() => {
    global.fetch = originalFetch
  })

  it('affiche le titre, le prix, l adresse et les caracteristiques', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-basic' })} />)
    expect(screen.getByText('Villa a Nkembo')).toBeInTheDocument()
    expect(screen.getByText(/À louer.*250.*000.*F CFA/)).toBeInTheDocument()
    expect(screen.getByText('Libreville, Estuaire, Nkembo')).toBeInTheDocument()
    expect(screen.getByText('120 m²')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('navigue et trace l evenement au clic sur la carte', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-click' })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(trackEvent).toHaveBeenCalledWith(
      'card-click',
      expect.objectContaining({ source: '/search-property', property_id: 'p-click' }),
    )
    expect(push).toHaveBeenCalledWith('/annonce/p-click')
  })

  it('masque la date de publication quand hideDate est actif', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-hide' })} hideDate />)
    expect(screen.queryByText(/Publiée/)).not.toBeInTheDocument()
  })

  it('affiche la date de publication par defaut', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-date' })} />)
    expect(screen.getByText(/Publiée/)).toBeInTheDocument()
  })

  it('retombe sur l image par defaut quand aucune image n est fournie', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-noimg', images: [] })} />)
    expect(screen.getByAltText('Villa a Nkembo')).toHaveAttribute('data-src', '/home.png')
    expect(logImageFallback).toHaveBeenCalled()
  })

  it('bascule sur l image de secours quand l image principale echoue', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-error' })} />)
    const img = screen.getByAltText('Villa a Nkembo')
    expect(img).toHaveAttribute('data-src', 'https://cdn/photo.jpg')
    fireEvent.error(img)
    expect(logImageError).toHaveBeenCalled()
  })

  it('affiche le badge proprietaire direct de maniere synchrone', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-owner', isOwner: true })} />)
    expect(screen.getByText('Propriétaire direct')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('affiche le badge numero verifie quand le proprietaire est verifie', () => {
    render(
      <PropertyCard
        property={baseProperty({ id: 'p-verified', createdBy: { phoneNumberVerified: true } })}
      />,
    )
    expect(screen.getByText('Numéro vérifié')).toBeInTheDocument()
  })

  it('detecte le statut proprietaire direct de maniere asynchrone', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ isOwner: true }) })
    render(<PropertyCard property={baseProperty({ id: 'p-async-owner' })} />)
    expect(screen.queryByText('Propriétaire direct')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Propriétaire direct')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/property/id?id=p-async-owner'))
  })

  it('ne rend pas les chambres/salles de bain pour un type de bien non concerne', () => {
    render(
      <PropertyCard
        property={baseProperty({ id: 'p-land', typeProperty: 'Land', nbrRooms: 5, nbrBathrooms: 2 })}
      />,
    )
    expect(screen.queryByText('5')).not.toBeInTheDocument()
  })
})
