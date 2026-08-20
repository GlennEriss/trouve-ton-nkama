import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CategoryAttributeFilters from '@/components/search/CategoryAttributeFilters'

const push = jest.fn()
let searchParamsString = ''
let leavesQueryState: any
let facetOptionsCalls: string[] = []

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => leavesQueryState,
}))

jest.mock('@/hooks/useAlgoliaFacetOptions', () => ({
  useAlgoliaCategoryAttributeOptions: (attributeKey: string) => {
    facetOptionsCalls.push(attributeKey)
    return { options: [{ label: 'M', value: 'M', count: 3 }, { label: 'L', value: 'L', count: 1 }], isLoading: false }
  },
}))

jest.mock('@/components/shared/ui/MultiSelectApp', () => ({
  MultiSelect: ({ options, value, onValueChange, placeholder }: any) => (
    <div data-testid={`multiselect-${placeholder}`}>
      <span data-testid={`value-${placeholder}`}>{value.join(',')}</span>
      <button type="button" onClick={() => onValueChange([...value, options[0]?.value].filter(Boolean))}>
        toggle {placeholder}
      </button>
    </div>
  ),
}))

const VETEMENTS_LEAF = {
  id: 'vetements',
  slug: 'vetements',
  name: 'Vêtements',
  rootId: 'mode',
  rootName: 'Mode',
  locationPrecision: 'city',
  attributeSchema: [
    { key: 'taille', label: 'Taille', type: 'enum', options: ['S', 'M', 'L'], required: true, facetable: true, primary: true },
    { key: 'marque', label: 'Marque', type: 'text', required: false, facetable: true, primary: true },
    { key: 'genre', label: 'Genre', type: 'enum', options: ['Femme', 'Homme'], required: true, facetable: true, primary: true },
    { key: 'etat', label: 'État', type: 'enum', options: ['Neuf'], required: true, facetable: true, primary: false },
    { key: 'couleur', label: 'Couleur', type: 'text', required: false, facetable: true, primary: false },
    { key: 'interne', label: 'Champ interne', type: 'text', required: false, facetable: false, primary: false },
  ],
}

describe('CategoryAttributeFilters', () => {
  beforeEach(() => {
    push.mockClear()
    facetOptionsCalls = []
    leavesQueryState = { data: [VETEMENTS_LEAF] }
  })

  it("ne rend rien sans categoryId dans l'URL", () => {
    searchParamsString = ''
    const { container } = render(<CategoryAttributeFilters />)
    expect(container).toBeEmptyDOMElement()
  })

  it("ne rend rien si categoryId ne correspond a aucune feuille connue", () => {
    searchParamsString = 'categoryId=inconnu'
    const { container } = render(<CategoryAttributeFilters />)
    expect(container).toBeEmptyDOMElement()
  })

  it('genere uniquement les champs facetable, primary en premier', () => {
    searchParamsString = 'categoryId=vetements'
    render(<CategoryAttributeFilters />)

    expect(screen.getByText('Vêtements')).toBeInTheDocument()
    expect(screen.getByText('Taille')).toBeInTheDocument()
    expect(screen.getByText('Marque')).toBeInTheDocument()
    expect(screen.getByText('Genre')).toBeInTheDocument()
    expect(screen.getByText('État')).toBeInTheDocument()
    expect(screen.getByText('Couleur')).toBeInTheDocument()
    expect(screen.queryByText('Champ interne')).not.toBeInTheDocument()

    // primary (taille, marque, genre) avant non-primary (etat, couleur)
    const labels = screen.getAllByText(/Taille|Marque|Genre|État|Couleur/).map((el) => el.textContent)
    expect(labels.indexOf('Genre')).toBeLessThan(labels.indexOf('État'))
    expect(labels.indexOf('Genre')).toBeLessThan(labels.indexOf('Couleur'))
  })

  it('scope useAlgoliaCategoryAttributeOptions par attribut facetable seulement', () => {
    searchParamsString = 'categoryId=vetements'
    render(<CategoryAttributeFilters />)

    expect(facetOptionsCalls.sort()).toEqual(['couleur', 'etat', 'genre', 'marque', 'taille'].sort())
  })

  it("initialise la valeur d'un champ depuis attr_<key> et ecrit dans l'URL au changement", () => {
    searchParamsString = 'categoryId=vetements&attr_taille=M&province=Estuaire'
    render(<CategoryAttributeFilters />)

    expect(screen.getByTestId('value-Taille').textContent).toBe('M')

    fireEvent.click(screen.getByText('toggle Taille'))

    const url = push.mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('attr_taille')).toBe('M,M')
    expect(params.get('categoryId')).toBe('vetements')
    expect(params.get('province')).toBe('Estuaire')
  })

  it("initialise a une selection vide quand attr_<key> est absent de l'URL", () => {
    searchParamsString = 'categoryId=vetements'
    render(<CategoryAttributeFilters />)

    expect(screen.getByTestId('value-Marque').textContent).toBe('')
  })
})
