import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import PropertyDetailsPanel from '@/components/search/PropertyDetailsPanel'

const push = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('@trouve-ton-nkama/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@/lib/property-images', () => ({
  getPrimaryPropertyImageUrl: (images: unknown) => (Array.isArray(images) && images.length > 0 ? 'https://cdn/main.jpg' : undefined),
}))

describe('PropertyDetailsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ne rend rien sans propriete selectionnee', () => {
    const { container } = render(<PropertyDetailsPanel selectedProperty={null} onClose={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le titre, le type traduit, le prix et la localisation', () => {
    render(
      <PropertyDetailsPanel
        selectedProperty={{ objectID: 'p1', title: 'Villa a Nkembo', typeProperty: 'villa', price: 250000, city: 'Libreville', images: ['a.jpg'] }}
        onClose={jest.fn()}
      />,
    )
    expect(screen.getByText('Villa a Nkembo')).toBeInTheDocument()
    expect(screen.getByText('Villa')).toBeInTheDocument()
    expect(screen.getByText(`${(250000).toLocaleString()} FCFA`)).toBeInTheDocument()
    expect(screen.getByText('Libreville')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn/main.jpg')
  })

  it('affiche des valeurs par defaut pour un type inconnu et un prix absent', () => {
    render(
      <PropertyDetailsPanel
        selectedProperty={{ objectID: 'p2', name: 'Terrain', typeProperty: 'unknown_type', images: [] }}
        onClose={jest.fn()}
      />,
    )
    expect(screen.getByText('Terrain')).toBeInTheDocument()
    expect(screen.getByText('unknown_type')).toBeInTheDocument()
    expect(screen.getByText('Prix sur demande')).toBeInTheDocument()
    expect(screen.getByText('Non spécifié')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('ferme le panneau au clic sur la croix', () => {
    const onClose = jest.fn()
    render(<PropertyDetailsPanel selectedProperty={{ objectID: 'p1', title: 'Villa' }} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('navigue vers la fiche detaillee au clic sur Voir les details', () => {
    render(<PropertyDetailsPanel selectedProperty={{ objectID: 'p1', title: 'Villa' }} onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Voir les détails'))
    expect(push).toHaveBeenCalledWith('/houseDetails/p1')
  })
})
