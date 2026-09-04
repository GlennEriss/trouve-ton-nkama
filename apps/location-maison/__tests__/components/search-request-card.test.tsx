import React from 'react'
import { render, screen } from '@testing-library/react'

import SearchRequestCard from '@/components/search-requests/SearchRequestCard'
import type { SearchRequest } from '@/models/search-request'

jest.mock('@/constantes/property-type', () => ({
  TypeProperty: { Home: 'Maison', Studio: 'Studio' },
  TypePropertyEnum: { Home: 'home', Studio: 'studio' },
}))

const baseItem = {
  id: 'sr-1',
  typeProperty: 'Home',
  transactionType: 'FOR_RENT',
  province: 'Estuaire',
  city: 'Libreville',
  neighborhood: 'Akanda',
  budgetMinXaf: 100000,
  budgetMaxXaf: 250000,
  description: 'Cherche une maison avec jardin.',
  whatsappContact: '24174000000',
} as unknown as SearchRequest

const makeItem = (overrides: Record<string, unknown> = {}) =>
  ({ ...(baseItem as object), ...overrides }) as unknown as SearchRequest

describe('SearchRequestCard', () => {
  it('affiche le type de bien, la localisation et la description', () => {
    render(<SearchRequestCard item={baseItem} />)

    expect(screen.getByText('Maison')).toBeInTheDocument()
    expect(screen.getByText('Cherche à louer — Libreville, Akanda')).toBeInTheDocument()
    expect(screen.getByText('Estuaire')).toBeInTheDocument()
    expect(screen.getByText('Cherche une maison avec jardin.')).toBeInTheDocument()
  })

  it('libelle une demande d achat differemment d une location', () => {
    render(<SearchRequestCard item={makeItem({ transactionType: 'FOR_SALE' })} />)
    expect(screen.getByText(/Cherche à acheter/)).toBeInTheDocument()
  })

  it('omet le quartier quand il n est pas renseigne', () => {
    render(<SearchRequestCard item={makeItem({ neighborhood: undefined })} />)
    expect(screen.getByText('Cherche à louer — Libreville')).toBeInTheDocument()
  })

  it('formate le budget en milliers', () => {
    render(<SearchRequestCard item={baseItem} />)
    expect(screen.getByText(/Budget :/)).toHaveTextContent('100 000')
    expect(screen.getByText(/Budget :/)).toHaveTextContent('250 000')
  })

  it('construit un lien WhatsApp avec un message pre-rempli', () => {
    render(<SearchRequestCard item={baseItem} />)

    const link = screen.getByRole('link', { name: /Contacter sur WhatsApp/ })
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/24174000000'))
    expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent('Maison')))
    expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent('Libreville')))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('construit un lien WhatsApp fonctionnel meme pour l ancien format local stocke en base', () => {
    // Bug réel trouvé en construisant cette demande : whatsappContact était stocké au format
    // local ("062459646", 0 initial) — utilisé tel quel, `wa.me/062459646` ne fonctionne pas
    // (wa.me exige l'indicatif pays sans le 0 initial). Corrigé sans dépendre d'une migration
    // des demandes déjà en base.
    render(<SearchRequestCard item={makeItem({ whatsappContact: '062459646' })} />)
    const link = screen.getByRole('link', { name: /Contacter sur WhatsApp/ })
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/24162459646'))
  })

  it('construit aussi un lien correct si whatsappContact est deja au format +241', () => {
    render(<SearchRequestCard item={makeItem({ whatsappContact: '+24162459646' })} />)
    const link = screen.getByRole('link', { name: /Contacter sur WhatsApp/ })
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/24162459646'))
  })

  describe('badge de boost', () => {
    it('signale une recherche urgente quand le boost court encore', () => {
      const future = { toMillis: () => Date.now() + 60_000 }
      render(<SearchRequestCard item={makeItem({ boostEndAt: future })} />)
      expect(screen.getByText('Recherche urgente')).toBeInTheDocument()
    })

    it('n affiche pas le badge quand le boost est expire', () => {
      const past = { toMillis: () => Date.now() - 60_000 }
      render(<SearchRequestCard item={makeItem({ boostEndAt: past })} />)
      expect(screen.queryByText('Recherche urgente')).not.toBeInTheDocument()
    })

    it('n affiche pas le badge en l absence de boost', () => {
      render(<SearchRequestCard item={baseItem} />)
      expect(screen.queryByText('Recherche urgente')).not.toBeInTheDocument()
    })

    // Firestore renvoie un Timestamp, mais une demande serialisee (SSR, cache)
    // arrive en chaine ISO : les deux formes doivent etre comprises.
    it('accepte une date de fin de boost serialisee en chaine ISO', () => {
      const iso = new Date(Date.now() + 60_000).toISOString()
      render(<SearchRequestCard item={makeItem({ boostEndAt: iso })} />)
      expect(screen.getByText('Recherche urgente')).toBeInTheDocument()
    })
  })
})
