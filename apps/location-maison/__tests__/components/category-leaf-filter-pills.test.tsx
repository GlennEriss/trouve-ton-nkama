import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CategoryLeafFilterPills from '@/components/search/CategoryLeafFilterPills'

const push = jest.fn()
let searchParamsString = ''
let leavesQueryState: any

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => leavesQueryState,
}))

const MODE_LEAVES = [
  { id: 'vetements', slug: 'vetements', name: 'Vêtements', rootId: 'mode', rootName: 'Mode' },
  { id: 'chaussures', slug: 'chaussures', name: 'Chaussures', rootId: 'mode', rootName: 'Mode' },
]

describe('CategoryLeafFilterPills', () => {
  beforeEach(() => {
    push.mockClear()
    leavesQueryState = { data: MODE_LEAVES }
  })

  it("ne rend rien sans categorie active dans l'URL", () => {
    searchParamsString = ''
    const { container } = render(<CategoryLeafFilterPills />)
    expect(container).toBeEmptyDOMElement()
  })

  it("ne rend rien pour une categorie avec moins de 2 feuilles (ex: Immobilier)", () => {
    searchParamsString = 'category=Immobilier'
    const { container } = render(<CategoryLeafFilterPills />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche les feuilles de la categorie Mode active', () => {
    searchParamsString = 'category=Mode'
    render(<CategoryLeafFilterPills />)
    expect(screen.getByText('Tout Mode')).toBeInTheDocument()
    expect(screen.getByText('Vêtements')).toBeInTheDocument()
    expect(screen.getByText('Chaussures')).toBeInTheDocument()
  })

  it('ecrit categoryId au clic sur une feuille et purge les attr_* existants', () => {
    searchParamsString = 'category=Mode&attr_taille=M&province=Estuaire'
    render(<CategoryLeafFilterPills />)

    fireEvent.click(screen.getByText('Vêtements'))

    const url = push.mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('categoryId')).toBe('vetements')
    expect(params.has('attr_taille')).toBe(false)
    expect(params.get('province')).toBe('Estuaire')
  })

  it('efface categoryId et les attr_* au clic sur "Tout Mode"', () => {
    searchParamsString = 'category=Mode&categoryId=vetements&attr_taille=M'
    render(<CategoryLeafFilterPills />)

    fireEvent.click(screen.getByText('Tout Mode'))

    const url = push.mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.has('categoryId')).toBe(false)
    expect(params.has('attr_taille')).toBe(false)
  })
})
