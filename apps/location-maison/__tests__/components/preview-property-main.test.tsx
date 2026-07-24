import React from 'react'
import { render, screen } from '@testing-library/react'

import PreviewProperty from '@/components/preview-property/PreviewProperty'

let userState: any

jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: userState }) }))
jest.mock('@/components/preview-property/Tag', () => ({
  __esModule: true,
  default: ({ name }: any) => <span data-testid="tag">{name}</span>,
}))
jest.mock('@/components/preview-property/CarouselProperty', () => ({
  __esModule: true,
  default: ({ images }: any) => <div data-testid="carousel">{images.length} photos</div>,
}))
jest.mock('@/components/preview-property/DetailsProperty', () => ({
  __esModule: true,
  default: () => <div data-testid="details" />,
}))
jest.mock('@/components/preview-property/ButtonFavoris', () => ({ ButtonFavoris: () => <div data-testid="favoris" /> }))
jest.mock('@/components/preview-property/ContactSection', () => ({
  __esModule: true,
  default: () => <div data-testid="contact" />,
}))
jest.mock('@/components/preview-property/MapSection', () => ({ MapSection: () => <div data-testid="map" /> }))
jest.mock('@/components/preview-property/ButtonShare', () => ({
  __esModule: true,
  default: () => <div data-testid="share" />,
}))
jest.mock('@/components/property/PropertyStatisticsSummary', () => ({
  __esModule: true,
  default: () => <div data-testid="stats-summary" />,
}))

function baseProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prop-1',
    createdBy: 'owner-1',
    title: 'Villa a Nkembo',
    price: 250000,
    status: 'FOR_RENT',
    street: 'Nkembo',
    city: 'Libreville',
    province: 'Estuaire',
    tags: ['piscine', 'garage'],
    images: ['a.jpg'],
    description: 'Une belle villa.',
    state: 'IN_PROGRESS',
    createdAt: { seconds: 1735689600 },
    updatedAt: { seconds: 1735776000 },
    ...overrides,
  }
}

describe('PreviewProperty', () => {
  beforeEach(() => {
    userState = null
  })

  it('affiche le statut, les tags, le titre et le prix', () => {
    render(<PreviewProperty property={baseProperty() as any} />)
    const tags = screen.getAllByTestId('tag')
    expect(tags.map((t) => t.textContent)).toEqual(['A LOUER', 'piscine', 'garage'])
    expect(screen.getByText('Villa a Nkembo')).toBeInTheDocument()
    expect(screen.getByText(/FCFA.*250.*000/)).toBeInTheDocument()
  })

  it('affiche le statut A VENDRE pour une annonce en vente', () => {
    render(<PreviewProperty property={baseProperty({ status: 'FOR_SALE', tags: [] }) as any} />)
    expect(screen.getAllByTestId('tag')[0]).toHaveTextContent('A VENDRE')
  })

  it('affiche l alerte propriete archivee quand le statut est ARCHIVED', () => {
    render(<PreviewProperty property={baseProperty({ state: 'ARCHIVED' }) as any} />)
    expect(screen.getByText('Propriété non disponible')).toBeInTheDocument()
  })

  it('n affiche pas l alerte archivee pour une propriete active', () => {
    render(<PreviewProperty property={baseProperty() as any} />)
    expect(screen.queryByText('Propriété non disponible')).not.toBeInTheDocument()
  })

  it('affiche les dates de creation et de modification formatees', () => {
    render(<PreviewProperty property={baseProperty() as any} />)
    expect(screen.getByText(/Créé le:/)).toBeInTheDocument()
    expect(screen.getByText(/Modifié le:/)).toBeInTheDocument()
  })

  it('affiche Date inconnue quand createdAt/updatedAt sont absents', () => {
    render(<PreviewProperty property={baseProperty({ createdAt: null, updatedAt: null }) as any} />)
    expect(screen.getAllByText(/Date inconnue/).length).toBe(2)
  })

  it('affiche la section localisation seulement si additionnalInformation est presente', () => {
    const { rerender } = render(<PreviewProperty property={baseProperty() as any} />)
    expect(screen.queryByText('Localisation')).not.toBeInTheDocument()
    rerender(<PreviewProperty property={baseProperty({ additionnalInformation: 'Pres du marche' }) as any} />)
    expect(screen.getByText('Localisation')).toBeInTheDocument()
    expect(screen.getByText('Pres du marche')).toBeInTheDocument()
  })

  it('n affiche les statistiques que pour le proprietaire', () => {
    userState = { uid: 'someone-else' }
    render(<PreviewProperty property={baseProperty() as any} />)
    expect(screen.queryByTestId('stats-summary')).not.toBeInTheDocument()

    userState = { uid: 'owner-1' }
    render(<PreviewProperty property={baseProperty() as any} />)
    expect(screen.getByTestId('stats-summary')).toBeInTheDocument()
  })
})
