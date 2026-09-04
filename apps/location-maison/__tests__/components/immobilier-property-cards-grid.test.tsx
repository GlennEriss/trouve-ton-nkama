import React from 'react'
import { render, screen } from '@testing-library/react'

import ImmobilierPropertyCardsGrid from '@/components/seo/ImmobilierPropertyCardsGrid'
import type { LandingPropertyCard } from '@/lib/seo/algolia-listings'

/**
 * Voir docs/location-maison/troubleshooting/BUGS-PROPERTY-E2E-2026-08.md, "LCP mobile 9,5s sur
 * les pages /immobilier/*" : Search Console signalait un LCP > 4s (9,5s mesuré, reproduit et
 * confirmé en local) sur toutes les pages générées par ce composant. Cause : aucune card
 * n'avait `priority`, donc l'image LCP (la toute première card) était lazy-loadée par
 * next/image — le navigateur n'entamait le téléchargement qu'après hydratation JS.
 */
jest.mock('@/components/home-page/PropertyCard', () => ({
  __esModule: true,
  default: ({ property, priority }: any) => (
    <div data-testid="property-card" data-priority={String(Boolean(priority))}>
      {property.id}
    </div>
  ),
}))
jest.mock('@/components/ads/SponsoredSlot', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="sponsored-slot">{props.rotationIndex}</div>,
}))
jest.mock('@/lib/ads/config', () => ({ ADSENSE_SLOTS: { immobilierInline: 'immobilier-inline-slot' } }))

const makeProperties = (count: number): LandingPropertyCard[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    objectID: `p${index}`,
    path: `properties/p${index}`,
    detailsHref: `/annonce/p${index}`,
    title: `Annonce ${index}`,
    description: '',
    price: 100000,
    status: 'FOR_RENT',
    typeProperty: 'Home',
    city: 'Libreville',
    province: 'Estuaire',
    street: '',
    area: 80,
    images: [],
  }))

describe('ImmobilierPropertyCardsGrid', () => {
  it('ne passe priority qu\'a la toute premiere card de la grille (element LCP de la page)', () => {
    render(<ImmobilierPropertyCardsGrid properties={makeProperties(5)} />)

    const cards = screen.getAllByTestId('property-card')
    expect(cards).toHaveLength(5)
    expect(cards[0]).toHaveAttribute('data-priority', 'true')
    for (const card of cards.slice(1)) {
      expect(card).toHaveAttribute('data-priority', 'false')
    }
  })

  it('reste correct meme avec une seule annonce', () => {
    render(<ImmobilierPropertyCardsGrid properties={makeProperties(1)} />)
    expect(screen.getByTestId('property-card')).toHaveAttribute('data-priority', 'true')
  })

  it('la premiere card garde priority=true meme quand une pub s\'insere plus loin dans le flux', () => {
    // FIRST_AD_AFTER_INDEX = 7 dans le composant : la pub arrive après la 8e card, la
    // première card (celle qui compte pour le LCP) n'est jamais affectée par ce découpage.
    render(<ImmobilierPropertyCardsGrid properties={makeProperties(10)} />)

    const cards = screen.getAllByTestId('property-card')
    expect(cards).toHaveLength(10)
    expect(cards[0]).toHaveAttribute('data-priority', 'true')
    expect(screen.getByTestId('sponsored-slot')).toBeInTheDocument()
  })
})
