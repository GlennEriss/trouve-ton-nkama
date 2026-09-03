import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import SearchRequestsListClient from '@/components/search-requests/SearchRequestsListClient'

// Même mock que ad-management-page.test.tsx (AdManagementPage.tsx, précédent qui a établi ce
// pattern de Sheet mobile) : Radix Dialog sous jsdom est contourné par un contexte minimal
// open/onOpenChange, plutôt que de dépendre de son vrai comportement (portails, focus trap...)
// non nécessaire pour vérifier que CE composant relie bien le bouton/les champs/les boutons du
// footer au bon state.
jest.mock('@trouve-ton-nkama/ui/sheet', () => {
  const ReactModule = require('react') as typeof React
  const SheetContext = ReactModule.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
    open: false,
    onOpenChange: () => {},
  })
  return {
    Sheet: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) => (
      <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>
    ),
    SheetTrigger: ({ children }: { children: React.ReactElement }) => {
      const { onOpenChange } = ReactModule.useContext(SheetContext)
      return ReactModule.cloneElement(children, { onClick: () => onOpenChange(true) })
    },
    SheetContent: ({ children }: { children: React.ReactNode }) => {
      const { open } = ReactModule.useContext(SheetContext)
      return open ? <div role="dialog" aria-label="Filtres (mobile)">{children}</div> : null
    },
    SheetClose: ({ children }: { children: React.ReactElement }) => {
      const { onOpenChange } = ReactModule.useContext(SheetContext)
      return ReactModule.cloneElement(children, { onClick: () => onOpenChange(false) })
    },
    SheetHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
    SheetFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  }
})

const getSearchRequests = jest.fn()
const getBoostedSearchRequests = jest.fn()

jest.mock('@/db/search-request.db', () => ({
  getSearchRequests: (...args: unknown[]) => getSearchRequests(...args),
  getBoostedSearchRequests: (...args: unknown[]) => getBoostedSearchRequests(...args),
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))
jest.mock('@/constantes/property-type', () => ({
  TypeProperty: { Home: 'Maison', Studio: 'Studio' },
  TypePropertyEnum: { Home: 'home', Studio: 'studio' },
}))
jest.mock('@/constantes/gabon-locations', () => ({
  GABON_PROVINCES: [
    { name: 'Estuaire', capital: 'Libreville' },
    { name: 'Ogooué-Maritime', capital: 'Port-Gentil' },
  ],
}))
jest.mock('@/components/search-requests/SearchRequestCard', () => ({
  __esModule: true,
  default: ({ item }: any) => <div data-testid="card">{item.id}</div>,
}))

const makeRequest = (id: string) => ({ id, city: 'Libreville' })

describe('SearchRequestsListClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getBoostedSearchRequests.mockResolvedValue([])
    getSearchRequests.mockResolvedValue({ searchRequests: [], lastDoc: null, limitPerPage: 24 })
  })

  it('affiche un etat de chargement puis le vide quand aucune demande ne correspond', async () => {
    render(<SearchRequestsListClient />)

    expect(screen.getByText('Chargement...')).toBeInTheDocument()
    expect(await screen.findByText(/Aucune demande de recherche pour ces critères/)).toBeInTheDocument()
  })

  it('rend les demandes standard sous le titre general', async () => {
    getSearchRequests.mockResolvedValue({
      searchRequests: [makeRequest('sr-1'), makeRequest('sr-2')],
      lastDoc: null,
      limitPerPage: 24,
    })

    render(<SearchRequestsListClient />)

    expect(await screen.findByText('Toutes les demandes')).toBeInTheDocument()
    expect(screen.getAllByTestId('card')).toHaveLength(2)
  })

  it('met les demandes boostees en avant dans leur propre section', async () => {
    getBoostedSearchRequests.mockResolvedValue([makeRequest('boost-1')])

    render(<SearchRequestsListClient />)

    expect(await screen.findByText('Recherches urgentes')).toBeInTheDocument()
    expect(screen.getByTestId('card')).toHaveTextContent('boost-1')
  })

  // Les deux requetes sont independantes : sans deduplication, une demande
  // boostee apparaitrait deux fois sur la page.
  it('ne repete pas une demande boostee dans le flux general', async () => {
    getBoostedSearchRequests.mockResolvedValue([makeRequest('sr-1')])
    getSearchRequests.mockResolvedValue({
      searchRequests: [makeRequest('sr-1'), makeRequest('sr-2')],
      lastDoc: null,
      limitPerPage: 24,
    })

    render(<SearchRequestsListClient />)

    await screen.findByText('Recherches urgentes')
    const ids = screen.getAllByTestId('card').map((el) => el.textContent)
    expect(ids).toEqual(['sr-1', 'sr-2'])
  })

  it('interroge la premiere page sans filtre au montage', async () => {
    render(<SearchRequestsListClient />)

    await waitFor(() => expect(getSearchRequests).toHaveBeenCalled())
    expect(getSearchRequests).toHaveBeenCalledWith({
      limitPerPage: 24,
      lastDoc: null,
      typeProperty: undefined,
      transactionType: undefined,
      city: undefined,
    })
  })

  it('relance la recherche avec le type de bien choisi', async () => {
    render(<SearchRequestsListClient />)
    await waitFor(() => expect(getSearchRequests).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByDisplayValue('Tous les types de bien'), { target: { value: 'Home' } })

    await waitFor(() =>
      expect(getSearchRequests).toHaveBeenLastCalledWith(expect.objectContaining({ typeProperty: 'Home' })),
    )
  })

  it('relance la recherche avec le type de transaction choisi', async () => {
    render(<SearchRequestsListClient />)
    await waitFor(() => expect(getSearchRequests).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByDisplayValue('Location ou vente'), { target: { value: 'FOR_SALE' } })

    await waitFor(() =>
      expect(getSearchRequests).toHaveBeenLastCalledWith(expect.objectContaining({ transactionType: 'FOR_SALE' })),
    )
  })

  it('relance la recherche avec la ville choisie', async () => {
    render(<SearchRequestsListClient />)
    await waitFor(() => expect(getSearchRequests).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByDisplayValue('Toutes les villes'), { target: { value: 'Port-Gentil' } })

    await waitFor(() =>
      expect(getSearchRequests).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Port-Gentil' })),
    )
  })

  it('propose de publier sa propre recherche', async () => {
    render(<SearchRequestsListClient />)
    expect(screen.getByRole('link', { name: /Publier ma recherche/ })).toBeInTheDocument()
  })

  it('ouvre les filtres mobile dans un Sheet (bouton filtre), applique et réinitialise', async () => {
    // Demande explicite de l'utilisateur : sur mobile, les 3 filtres alignés prenaient trop de
    // place — repliés dans un Sheet, même convention que AdManagementPage.tsx/MyReelsClient.tsx.
    render(<SearchRequestsListClient />)
    // Le bouton "Filtres" n'apparaît qu'une fois l'état déterminé (ici l'état vide, aucune
    // demande ne correspond) — plus vrai depuis qu'il est apparié au titre "Toutes les
    // demandes"/l'état vide plutôt que rendu inconditionnellement dès le montage.
    const filterButton = await screen.findByRole('button', { name: 'Filtres' })

    expect(screen.queryByRole('dialog', { name: 'Filtres (mobile)' })).not.toBeInTheDocument()
    // Pas de pastille "filtre actif" tant qu'aucun filtre n'est posé.
    expect(document.querySelector('[aria-hidden].bg-secondary')).not.toBeInTheDocument()

    fireEvent.click(filterButton)

    const sheet = within(screen.getByRole('dialog', { name: 'Filtres (mobile)' }))
    expect(sheet.getByText('Filtres')).toBeVisible()
    const reinitialiser = sheet.getByRole('button', { name: 'Réinitialiser' })
    expect(reinitialiser).toBeDisabled()

    fireEvent.change(sheet.getByDisplayValue('Toutes les villes'), { target: { value: 'Port-Gentil' } })
    await waitFor(() =>
      expect(getSearchRequests).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Port-Gentil' })),
    )
    expect(reinitialiser).toBeEnabled()
    // La pastille "filtre actif" apparaît maintenant sur le bouton déclencheur — dans un waitFor
    // (pas un expect immédiat) : le changement de filtre repasse brièvement par `loading`, qui
    // démonte le bloc état-vide (et donc le bouton/sa pastille) jusqu'à ce que le fetch résolve.
    await waitFor(() =>
      expect(document.querySelector('[aria-hidden].bg-secondary')).toBeInTheDocument(),
    )

    fireEvent.click(reinitialiser)
    await waitFor(() =>
      expect(getSearchRequests).toHaveBeenLastCalledWith(expect.objectContaining({
        typeProperty: undefined, transactionType: undefined, city: undefined,
      })),
    )
    // Réinitialiser ne ferme pas le Sheet — laisse l'utilisateur continuer d'ajuster.
    expect(screen.getByRole('dialog', { name: 'Filtres (mobile)' })).toBeInTheDocument()

    fireEvent.click(sheet.getByRole('button', { name: 'Voir les résultats' }))
    expect(screen.queryByRole('dialog', { name: 'Filtres (mobile)' })).not.toBeInTheDocument()
  })

  it('place le bouton Filtres sur la meme ligne que le titre "Toutes les demandes"', async () => {
    // Demande explicite de l'utilisateur (avec capture d'ecran a l'appui) : le bouton se
    // retrouvait seul, centre au-dessus du titre au lieu d'etre sur la meme ligne.
    getSearchRequests.mockResolvedValue({
      searchRequests: [makeRequest('sr-1')],
      lastDoc: null,
      limitPerPage: 24,
    })
    render(<SearchRequestsListClient />)

    const heading = await screen.findByText('Toutes les demandes')
    const filterButton = screen.getByRole('button', { name: 'Filtres' })
    // Meme parent direct que le titre = meme ligne (voir le flex items-center du composant).
    expect(filterButton.parentElement).toBe(heading.parentElement)
  })

  // Bug reel trouve en ecrivant le premier e2e reel de ce filtre combine
  // (search-requests-filters.spec.ts) : le bouton Filtres n'etait rendu qu'a cote de "Toutes les
  // demandes" ou dans le message "Aucune demande" (qui exigeait AUSSI boosted vide) — les deux
  // disparaissaient ensemble des qu'une boostee restait affichee malgre un filtre sans resultat
  // regulier, laissant le bouton introuvable sans recharger la page.
  it('garde le bouton Filtres accessible quand seule une demande boostee reste (items vide)', async () => {
    getBoostedSearchRequests.mockResolvedValue([makeRequest('boost-1')])
    getSearchRequests.mockResolvedValue({ searchRequests: [], lastDoc: null, limitPerPage: 24 })

    render(<SearchRequestsListClient />)

    await screen.findByText('Recherches urgentes')
    // "Toutes les demandes" ne s'affiche pas (items vide)...
    expect(screen.queryByText('Toutes les demandes')).not.toBeInTheDocument()
    // ...et le message "Aucune demande" non plus (une boostee correspond bien a quelque chose).
    expect(screen.queryByText(/Aucune demande de recherche pour ces critères/)).not.toBeInTheDocument()
    // Mais le bouton Filtres reste accessible : c'est le point du correctif.
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeInTheDocument()
  })
})
