import React from 'react'
import { render, screen } from '@testing-library/react'

import PreviewCategoryListing from '@/components/preview-property/PreviewCategoryListing'

let currentUserState: any
let sellerState: any

jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: currentUserState }) }))
jest.mock('@/hooks/use-user-by-uid', () => ({ useUserByUID: () => ({ data: sellerState }) }))
jest.mock('@/components/preview-property/ButtonFavoris', () => ({ ButtonFavoris: () => <div data-testid="favoris" /> }))
jest.mock('@/components/preview-property/ButtonShare', () => ({
  __esModule: true,
  default: () => <div data-testid="share" />,
}))
jest.mock('@/components/preview-property/ContactSection', () => ({
  __esModule: true,
  default: () => <div data-testid="contact" />,
}))
jest.mock('@/components/preview-property/CarouselProperty', () => ({
  __esModule: true,
  default: ({ images }: any) => <div data-testid="carousel">{images.length} photos</div>,
}))
jest.mock('@/components/property/PropertyStatisticsSummary', () => ({
  __esModule: true,
  default: () => <div data-testid="stats" />,
}))
jest.mock('@/lib/property-images', () => ({ getPropertyImageUrls: (i: any) => i ?? [] }))

function modeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    createdBy: 'seller-1',
    title: '50ml parfum en vente',
    description: 'Parfum peu utilisé.',
    price: 10000,
    categoryId: 'parfums-beaute',
    categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Parfums & beauté' },
    attributes: { etat: 'Bon état', marque: 'Dior' },
    city: 'Libreville',
    province: 'Estuaire',
    images: ['a.jpg'],
    createdAt: { seconds: 1735689600 },
    ...overrides,
  }
}

describe('PreviewCategoryListing', () => {
  beforeEach(() => {
    currentUserState = null
    sellerState = { firstname: 'Royale parfumerie', lastname: '', image: null }
  })

  it('affiche prix, titre, chips (etat/categorie/ville) et description', () => {
    render(<PreviewCategoryListing property={modeListing() as any} />)

    expect(screen.getByText(/10\s*000 F CFA/)).toBeInTheDocument()
    expect(screen.getByText('50ml parfum en vente')).toBeInTheDocument()
    expect(screen.getByText('Bon état')).toBeInTheDocument()
    expect(screen.getByText('Parfums & beauté')).toBeInTheDocument()
    expect(screen.getByText('Libreville')).toBeInTheDocument()
    expect(screen.getByText('Parfum peu utilisé.')).toBeInTheDocument()
  })

  it('affiche les autres attributs en caracteristiques, sans repeter l etat', () => {
    render(<PreviewCategoryListing property={modeListing() as any} />)
    expect(screen.getByText('Caractéristiques')).toBeInTheDocument()
    expect(screen.getByText('Dior')).toBeInTheDocument()
    expect(screen.getAllByText('Bon état')).toHaveLength(1)
  })

  it('masque le bloc caracteristiques quand seul etat est renseigne', () => {
    render(<PreviewCategoryListing property={modeListing({ attributes: { etat: 'Neuf' } }) as any} />)
    expect(screen.queryByText('Caractéristiques')).not.toBeInTheDocument()
  })

  it('affiche le vendeur et la section contact', () => {
    render(<PreviewCategoryListing property={modeListing() as any} />)
    expect(screen.getByText('Vendeur')).toBeInTheDocument()
    expect(screen.getByText('Royale parfumerie')).toBeInTheDocument()
    expect(screen.getByTestId('contact')).toBeInTheDocument()
  })

  it('n affiche les statistiques que pour le proprietaire', () => {
    const { rerender } = render(<PreviewCategoryListing property={modeListing() as any} />)
    expect(screen.queryByTestId('stats')).not.toBeInTheDocument()

    currentUserState = { uid: 'seller-1' }
    rerender(<PreviewCategoryListing property={modeListing() as any} />)
    expect(screen.getByTestId('stats')).toBeInTheDocument()
  })

  it('gere une description absente sans planter', () => {
    render(<PreviewCategoryListing property={modeListing({ description: '' }) as any} />)
    expect(screen.getByText(/n'a pas ajouté de description/)).toBeInTheDocument()
  })
})
