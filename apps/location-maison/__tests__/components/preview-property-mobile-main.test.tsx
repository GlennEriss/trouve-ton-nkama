import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { PreviewPropertyMobile } from '@/components/preview-property/PreviewPropertyMobile'

let userData: any
const trackInteraction = jest.fn()

jest.mock('next/font/google', () => ({ Inter: () => ({ className: 'inter' }) }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
jest.mock('@/hooks/use-user-by-uid', () => ({ useUserByUID: () => ({ data: userData }) }))
jest.mock('@/hooks/use-track-property-interaction', () => ({
  useTrackPropertyInteraction: () => ({ trackInteraction }),
}))
jest.mock('@/components/preview-property/CarouselPropertyDetails', () => ({
  CarouselPropertyDetails: () => <div data-testid="carousel-details" />,
}))
jest.mock('@/components/preview-property/ButtonFavoris', () => ({ ButtonFavoris: () => <div data-testid="favoris" /> }))
jest.mock('@/components/preview-property/Tag', () => ({
  __esModule: true,
  default: ({ name }: any) => <span data-testid="tag">{name}</span>,
}))
jest.mock('@/components/preview-property/MapSection', () => ({ MapSection: () => <div data-testid="map" /> }))
jest.mock('@/components/preview-property/DetailsPropertyMobile', () => ({
  DetailsPropertyMobile: () => <div data-testid="details-mobile" />,
}))
jest.mock('@/components/preview-property/ButtonShareToFacebook', () => ({
  __esModule: true,
  default: () => <div data-testid="share-fb" />,
}))
jest.mock('@/components/preview-property/ButtonShareToWhatsapp', () => ({
  __esModule: true,
  default: () => <div data-testid="share-wa" />,
}))
jest.mock('@/components/reels/gift/GiftModal', () => ({
  __esModule: true,
  default: ({ isOpen, announcerName }: any) => (isOpen ? <div data-testid="gift-modal">{announcerName}</div> : null),
}))
jest.mock('@trouve-ton-nkama/ui/separator', () => ({ Separator: () => <hr /> }))
jest.mock('@trouve-ton-nkama/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarImage: () => <img alt="avatar" />,
  AvatarFallback: ({ children }: any) => <span data-testid="avatar-fallback">{children}</span>,
}))

function baseProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prop-1',
    title: 'Villa a Nkembo',
    price: 250000,
    status: 'FOR_RENT',
    street: 'Nkembo',
    city: 'Libreville',
    province: 'Estuaire',
    tags: ['piscine'],
    images: ['a.jpg'],
    description: 'Une belle villa.',
    state: 'IN_PROGRESS',
    createdBy: 'owner-1',
    createdAt: { seconds: 1735689600 },
    updatedAt: { seconds: 1735776000 },
    contact: null,
    ...overrides,
  }
}

describe('PreviewPropertyMobile', () => {
  const originalEnv = process.env
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_HOST: 'https://tonnkama.com' }
    userData = { firstname: 'Jean Paul', lastname: 'Dupont Mba', phoneNumbers: ['+24166545430'] }
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('affiche le statut, les tags, le titre, le prix et l adresse', () => {
    render(<PreviewPropertyMobile property={baseProperty() as any} />)
    expect(screen.getAllByTestId('tag').map((t) => t.textContent)).toEqual(['A LOUER', 'piscine'])
    expect(screen.getByText('Villa a Nkembo')).toBeInTheDocument()
    expect(screen.getByText(/FCFA.*250.*000/)).toBeInTheDocument()
  })

  it('affiche l initiale de l annonceur dans l avatar', () => {
    render(<PreviewPropertyMobile property={baseProperty() as any} />)
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('J')
    expect(screen.getByText('Jean Paul')).toBeInTheDocument()
    expect(screen.getByText('Dupont Mba')).toBeInTheDocument()
  })

  it('affiche l alerte propriete archivee quand le statut est ARCHIVED', () => {
    render(<PreviewPropertyMobile property={baseProperty({ state: 'ARCHIVED' }) as any} />)
    expect(screen.getByText('Propriété non disponible')).toBeInTheDocument()
  })

  it('trace le clic WhatsApp et construit le lien wa.me', () => {
    render(<PreviewPropertyMobile property={baseProperty() as any} />)
    const link = screen.getByTitle('Contacter via WhatsApp')
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/+24166545430?text='))
    fireEvent.click(link)
    expect(trackInteraction).toHaveBeenCalledWith('whatsapp_contact', { phoneNumber: '+24166545430' })
  })

  it('trace le clic telephone et construit le lien tel:', () => {
    render(<PreviewPropertyMobile property={baseProperty() as any} />)
    const link = screen.getByTitle('Appeler')
    expect(link).toHaveAttribute('href', 'tel:+24166545430')
    fireEvent.click(link)
    expect(trackInteraction).toHaveBeenCalledWith('phone_contact', { phoneNumber: '+24166545430' })
  })

  it('utilise # quand aucun numero n est disponible', () => {
    userData = undefined
    render(<PreviewPropertyMobile property={baseProperty({ contact: null }) as any} />)
    expect(screen.getByTitle('Contacter via WhatsApp')).toHaveAttribute('href', '#')
    expect(screen.getByTitle('Appeler')).toHaveAttribute('href', '#')
  })

  it('ouvre la modale de cadeau avec le nom complet de l annonceur', () => {
    render(<PreviewPropertyMobile property={baseProperty() as any} />)
    fireEvent.click(screen.getByTitle("Envoyer un cadeau à l'annonceur"))
    expect(screen.getByTestId('gift-modal')).toHaveTextContent('Jean Paul Dupont Mba')
  })

  it('affiche la section localisation seulement si additionnalInformation est presente', () => {
    const { rerender } = render(<PreviewPropertyMobile property={baseProperty() as any} />)
    expect(screen.queryByText('Localisation')).not.toBeInTheDocument()
    rerender(<PreviewPropertyMobile property={baseProperty({ additionnalInformation: 'Pres du marche' }) as any} />)
    expect(screen.getByText('Localisation')).toBeInTheDocument()
  })
})
