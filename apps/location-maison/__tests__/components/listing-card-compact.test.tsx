import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import ListingCard from '@/components/listing/ListingCard'

const push = jest.fn()
const trackEvent = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/' }))
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src }: any) => <img alt={alt} data-src={src} />,
}))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: { CTA_PROPERTY_CARD_CLICK: 'card-click' },
  useTrackEvent: () => ({ trackEvent }),
}))
jest.mock('@/lib/image-debug', () => ({
  logImageError: jest.fn(),
  logImageFallback: jest.fn(),
  logImageLoad: jest.fn(),
}))
jest.mock('@/lib/property-images', () => ({
  resolveThumbnailUrl: (image: any) => (image ? `https://cdn/${typeof image === 'string' ? image : image.fileURL}` : undefined),
}))

const favorisClickMock = jest.fn()
jest.mock('@/components/preview-property/ButtonFavoris', () => ({
  ButtonFavoris: ({ idProperty, source }: { idProperty: string; source: string }) => (
    <button
      type="button"
      aria-label="Ajouter aux favoris"
      onClick={(event) => {
        event.stopPropagation()
        favorisClickMock(idProperty, source)
      }}
    >
      coeur
    </button>
  ),
}))

function modeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-mode-1',
    title: 'Robe wax élégante',
    price: 18000,
    city: 'Libreville',
    province: 'Estuaire',
    categoryId: 'vetements',
    categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Vêtements' },
    attributes: { taille: 'M' },
    images: [{ fileURL: 'robe.jpg' }],
    createdAt: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

describe('ListingCard (density compact)', () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn(async () => ({ ok: false })) as any
  })
  afterAll(() => {
    global.fetch = originalFetch
  })

  it('affiche le prix, le titre, le lieu et le badge de categorie', () => {
    render(<ListingCard property={modeListing()} density="compact" />)

    expect(screen.getByText(/18.000 F CFA/)).toBeInTheDocument()
    expect(screen.getByText('Robe wax élégante')).toBeInTheDocument()
    expect(screen.getByText('Vêtements')).toBeInTheDocument()
    expect(screen.getByText(/Libreville, Estuaire/)).toBeInTheDocument()
  })

  it('ne rend pas le bloc chambres/salle de bain/surface', () => {
    render(<ListingCard property={modeListing()} density="compact" />)
    expect(screen.queryByText(/m²/)).not.toBeInTheDocument()
  })

  it('masque la date quand hideDate est actif', () => {
    render(<ListingCard property={modeListing()} density="compact" hideDate />)
    expect(screen.getByText('Libreville, Estuaire')).toBeInTheDocument()
  })

  it('navigue vers la fiche au clic sur la carte', () => {
    render(<ListingCard property={modeListing()} density="compact" />)
    fireEvent.click(screen.getByRole('button', { name: /Voir les détails/ }))
    expect(push).toHaveBeenCalledWith('/annonce/listing-mode-1')
  })

  it('le clic sur le coeur favori ne declenche pas la navigation vers la fiche', () => {
    render(<ListingCard property={modeListing()} density="compact" />)
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter aux favoris' }))
    expect(favorisClickMock).toHaveBeenCalledWith('listing-mode-1', 'listing_card')
    expect(push).not.toHaveBeenCalled()
  })
})
