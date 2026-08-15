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

// Le prix est reparti sur plusieurs noeuds texte adjacents dans le <p> (prefixe "À
// louer/vendre" dans un <span>, valeur et "F CFA" en texte JSX distincts) : getByText par
// defaut ne concatene pas le texte a travers les elements enfants, d'ou ce matcher dedie sur
// le textContent complet du <p>, restreint au tagName pour eviter les faux positifs sur les
// ancetres (dont le textContent inclut aussi le titre et le lieu).
function priceLineMatching(regex: RegExp) {
  return (_content: string, element: Element | null) =>
    element?.tagName === 'P' && regex.test(element.textContent ?? '')
}

describe('PropertyCard (gabarit compact commun a toute la plateforme)', () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn(async () => ({ ok: false })) as any
  })
  afterAll(() => {
    global.fetch = originalFetch
  })

  it('affiche le titre, le statut/prix, le badge de type et le lieu (quartier, ville, province, sans chambres/sdb)', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-basic' })} />)
    expect(screen.getByText('Villa a Nkembo')).toBeInTheDocument()
    expect(screen.getByText(priceLineMatching(/À louer.*250,000.*F CFA/))).toBeInTheDocument()
    expect(screen.getByText('Maison')).toBeInTheDocument()
    expect(screen.getByText(/^Nkembo, Libreville, Estuaire/)).toBeInTheDocument()
    expect(screen.queryByText('120 m²')).not.toBeInTheDocument()
  })

  it('affiche "À vendre" pour un statut FOR_SALE', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-sale', status: 'FOR_SALE' })} />)
    expect(screen.getByText(priceLineMatching(/À vendre.*250,000.*F CFA/))).toBeInTheDocument()
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
    expect(screen.getByText('Nkembo, Libreville, Estuaire')).toBeInTheDocument()
  })

  it('affiche la date de publication par defaut, accolee au lieu', () => {
    render(<PropertyCard property={baseProperty({ id: 'p-date' })} />)
    expect(screen.getByText(/Nkembo, Libreville, Estuaire.*·.*\d{2}\/\d{2}\/\d{4}/)).toBeInTheDocument()
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

  it('ne fetch jamais isOwner et ne montre aucun badge proprietaire/verifie (densite compact)', async () => {
    render(
      <PropertyCard
        property={baseProperty({ id: 'p-owner', isOwner: true, createdBy: { phoneNumberVerified: true } })}
      />,
    )
    expect(screen.queryByText('Propriétaire direct')).not.toBeInTheDocument()
    expect(screen.queryByText('Numéro vérifié')).not.toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
