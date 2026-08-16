import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import CarouselPropertyType from '@/components/home-page/CarouselPropertyType'

const push = jest.fn()
const setTypeProperty = jest.fn()
let summaryState: any
let leavesQueryState: any
let leafCountQueriesState: any[]
let leavesQueryOptions: any

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('@/providers/AlgoliaContext', () => ({ useAlgoliaContext: () => ({ setTypeProperty }) }))
jest.mock('@/hooks/use-server-property-count-summary', () => ({
  useServerPropertyCountSummary: () => summaryState,
}))
jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => {
    leavesQueryOptions = options
    return leavesQueryState
  },
  useQueries: () => leafCountQueriesState,
}))
jest.mock('react-slick', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="slider">{children}</div>,
}))
jest.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  useReducedMotion: () => false,
}))

const MODE_LEAVES = [
  { id: 'vetements', slug: 'vetements', name: 'Vêtements', rootId: 'mode', rootName: 'Mode' },
  { id: 'chaussures', slug: 'chaussures', name: 'Chaussures', rootId: 'mode', rootName: 'Mode' },
]

describe('CarouselPropertyType', () => {
  const originalFetch = global.fetch
  beforeEach(() => {
    jest.clearAllMocks()
    summaryState = { data: { byType: { Home: 5, Villa: 2 } }, isLoading: false, isError: false }
    leavesQueryState = { data: MODE_LEAVES }
    leafCountQueriesState = [
      { data: 8, isLoading: false, isError: false },
      { data: 1, isLoading: false, isError: false },
    ]
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) })) as any
  })
  afterAll(() => {
    global.fetch = originalFetch
  })

  it('affiche tous les types immobiliers, y compris Villa/Duplex/Entrepôt', () => {
    render(<CarouselPropertyType />)
    expect(screen.getByText('Villa')).toBeInTheDocument()
    expect(screen.getByText('Duplex')).toBeInTheDocument()
    expect(screen.getByText('Entrepôt')).toBeInTheDocument()
    expect(screen.getByText('Maison')).toBeInTheDocument()
  })

  it('affiche les feuilles Mode publiables avec leur compte, et navigue vers /search?categoryId=... au clic', () => {
    render(<CarouselPropertyType />)

    expect(screen.getByText('Vêtements')).toBeInTheDocument()
    expect(screen.getByText('8 Annonces')).toBeInTheDocument()
    expect(screen.getByText('Chaussures')).toBeInTheDocument()
    expect(screen.getByText('1 Annonce')).toBeInTheDocument()

    const card = screen.getByText('Vêtements').closest('[class*="cursor-pointer"]')!
    fireEvent.click(card)

    expect(push).toHaveBeenCalledWith('/search?categoryId=vetements')
    expect(setTypeProperty).not.toHaveBeenCalled()
  })

  it('navigue vers /search?typeProperty=... au clic sur une tuile immobiliere', () => {
    render(<CarouselPropertyType />)

    const card = screen.getByText('Maison').closest('[class*="cursor-pointer"]')!
    fireEvent.click(card)

    expect(setTypeProperty).toHaveBeenCalledWith(['Home'])
    expect(push).toHaveBeenCalledWith('/search?typeProperty=Home')
  })

  it("n'ajoute aucune tuile Mode quand aucune feuille n'est publiable", () => {
    leavesQueryState = { data: [] }
    render(<CarouselPropertyType />)
    expect(screen.queryByText('Vêtements')).not.toBeInTheDocument()
  })

  it('construit la requête des feuilles publiables', async () => {
    render(<CarouselPropertyType />)
    const leaves = await leavesQueryOptions.queryFn()
    expect(global.fetch).toHaveBeenCalledWith('/api/categories/publishable-leaves')
    expect(leaves).toEqual([])
  })
})
