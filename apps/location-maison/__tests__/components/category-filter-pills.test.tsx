import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import CategoryFilterPills from '@/components/search/CategoryFilterPills'

const push = jest.fn()
let searchParamsString = ''
let categoriesState: Array<{ id: string; slug: string; name: string; icon: null; order: number }>

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: categoriesState }),
}))

describe('CategoryFilterPills', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchParamsString = ''
    categoriesState = [
      { id: 'immobilier', slug: 'immobilier', name: 'Immobilier', icon: null, order: 0 },
      { id: 'mode', slug: 'mode', name: 'Mode', icon: null, order: 10 },
    ]
  })

  it('affiche les pastilles quand au moins 2 categories racine sont actives', () => {
    render(<CategoryFilterPills />)
    expect(screen.getByText('Toutes catégories')).toBeInTheDocument()
    expect(screen.getByText('Immobilier')).toBeInTheDocument()
    expect(screen.getByText('Mode')).toBeInTheDocument()
    expect(screen.getByText('Demandes')).toBeInTheDocument()
  })

  it('affiche quand meme la rangee (avec Demandes) meme avec une seule categorie racine active', () => {
    // Avant l'ajout du pill Demandes, la rangee entiere restait masquee tant qu'il n'y avait
    // qu'une seule categorie active (Immobilier) — Demandes est desormais toujours une
    // deuxieme option reelle, donc la rangee ne doit plus jamais disparaitre pour cette raison.
    categoriesState = [{ id: 'immobilier', slug: 'immobilier', name: 'Immobilier', icon: null, order: 0 }]
    render(<CategoryFilterPills />)
    expect(screen.getByText('Toutes catégories')).toBeInTheDocument()
    expect(screen.getByText('Immobilier')).toBeInTheDocument()
    expect(screen.getByText('Demandes')).toBeInTheDocument()
  })

  it('le clic sur Demandes pose category=Demandes et reinitialise les autres filtres', () => {
    // Demande explicite de l'utilisateur : un pill "Demandes" a cote de Mode, qui bascule vers
    // la section demandes directement sur /search.
    searchParamsString = 'minPrice=1000&city=Libreville'
    render(<CategoryFilterPills />)

    fireEvent.click(screen.getByText('Demandes'))

    const url = new URL(push.mock.calls[0][0] as string, 'http://localhost')
    expect(url.searchParams.get('category')).toBe('Demandes')
    expect([...url.searchParams.keys()]).toEqual(['category'])
  })

  it('"Toutes categories" n inclut jamais Demandes : seules Immobilier/Mode sont agregees', () => {
    // Demandes est un pill code en dur (DEMANDES_CATEGORY_NAME), volontairement separe du
    // tableau `categories` issu de /api/categories/active — "Toutes categories" (category vide)
    // ne filtre donc jamais sur Demandes, seulement sur les vraies racines Algolia.
    render(<CategoryFilterPills />)

    fireEvent.click(screen.getByText('Toutes catégories'))

    const url = new URL(push.mock.calls[0][0] as string, 'http://localhost')
    expect(url.searchParams.has('category')).toBe(false)
  })

  it('reinitialise TOUS les filtres (pas seulement immobilier-only) en changeant de section', () => {
    // Demande explicite d'un utilisateur constatant qu'un filtre posé sur "Toutes categories"
    // restait actif (invisible mais toujours applique) apres bascule vers Immobilier ou Mode,
    // et pareillement d'une section a l'autre — seule la recherche texte libre doit traverser
    // le changement de section, tout le reste repart a zero (pas juste les champs immobilier-only,
    // un filtre generique comme le Prix serait tout aussi trompeur en restant actif).
    searchParamsString =
      'categoryId=leaf-1&attr_taille=M&province=Estuaire&street=Glass&status=FOR_SALE' +
      '&minArea=10&maxArea=50&typeProperty=Villa&city=Libreville&minPrice=1000&maxPrice=9000' +
      '&tags=piscine&query=studio'
    render(<CategoryFilterPills />)

    fireEvent.click(screen.getByText('Mode'))

    expect(push).toHaveBeenCalledTimes(1)
    const url = new URL(push.mock.calls[0][0] as string, 'http://localhost')
    const params = url.searchParams

    expect(params.get('category')).toBe('Mode')
    // Seule la recherche texte libre traverse le changement de section.
    expect(params.get('query')).toBe('studio')
    expect([...params.keys()].sort()).toEqual(['category', 'query'])
  })

  it('efface aussi la recherche texte libre : reste identique en repassant sur "Toutes categories" sans query', () => {
    searchParamsString = 'category=Mode&categoryId=leaf-1&minPrice=1000'
    render(<CategoryFilterPills />)

    fireEvent.click(screen.getByText('Toutes catégories'))

    const url = new URL(push.mock.calls[0][0] as string, 'http://localhost')
    expect([...url.searchParams.keys()]).toEqual([])
  })
})
