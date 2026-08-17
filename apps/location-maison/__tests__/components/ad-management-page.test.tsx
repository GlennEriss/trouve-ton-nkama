import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { AdManagementPage } from '@/features/announcer/ad-management/ui/v1/AdManagementPage'
import type { Property } from '@/models/annonce'

const toastMock = jest.fn()
const setSearchInputMock = jest.fn()
const setScopeMock = jest.fn()
const setCategoryFilterMock = jest.fn()
const setPriceMinMock = jest.fn()
const setPriceMaxMock = jest.fn()
const setSortMock = jest.fn()
const resetFiltersMock = jest.fn()
const fetchNextPageMock = jest.fn()
const toggleAdStateMock = jest.fn()
const removeAdMock = jest.fn()

let managementState: ReturnType<typeof buildManagementState>

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

jest.mock('@/features/announcer/ad-management/hooks', () => ({
  useAdManagement: () => managementState,
}))

// use-current-user importe @/firebase/auth (getAuth) au chargement du module, qui
// plante sous jsdom sans clé Firebase valide — comme dans les tests des formulaires
// d'auth, on mocke le hook plutot que de laisser Jest resoudre le vrai SDK. Pas de
// pendingClaimNotice ici : ce test se concentre sur AdManagementPage, pas sur la
// banniere d'auto-attribution (voir auto-claim-banner.test.tsx).
jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: { uid: 'u1', metadata: {} }, refreshSession: jest.fn() }),
}))

jest.mock('@/components/promotion/PromotionBadge', () => ({
  __esModule: true,
  default: ({ property }: { property: Property }) => property.isPromoted ? <span>Promotion active</span> : null,
}))

jest.mock('@/components/promotion/PromotionButton', () => ({
  __esModule: true,
  default: ({ property }: { property: Property }) => <button type="button">Promouvoir {property.title}</button>,
}))

jest.mock('@trouve-ton-nkama/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
    <div>
      {children}
      <button type="button" data-testid="change-select" onClick={() => onValueChange?.('price_desc')}>Changer</button>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectTrigger: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  SelectValue: () => <span>Valeur</span>,
}))

jest.mock('@trouve-ton-nkama/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: 'property-9b',
    typeProperty: 'Home',
    images: [{ filePATH: 'properties/home.jpg', fileURL: 'https://example.com/home.jpg' }],
    title: 'Maison Akébé',
    description: 'Maison familiale',
    area: 120,
    price: 40000,
    tags: [],
    status: 'FOR_RENT',
    moderationStatus: 'APPROVED',
    state: 'IN_PROGRESS',
    createdAt: { seconds: 1_752_883_200, nanoseconds: 0 } as never,
    updatedAt: { toDate: () => new Date('2026-07-20T00:00:00.000Z') } as never,
    street: 'Akébé Poteau',
    city: 'Libreville',
    province: 'Estuaire',
    longitude: 9.45,
    latitude: 0.41,
    country: 'Gabon',
    countryCode: 'GA',
    ...overrides,
  }
}

function buildManagementState(overrides: Record<string, unknown> = {}) {
  return {
    userUid: 'announcer-9b',
    items: [
      property({ isPromoted: true }),
      property({
        id: 'property-archived-9b',
        title: 'Terrain Owendo',
        typeProperty: 'Land',
        status: 'FOR_SALE',
        state: 'ARCHIVED',
        moderationStatus: 'REJECTED',
        rejectionReason: 'Photo trop sombre',
        images: [],
        createdAt: '2026-07-18T00:00:00.000Z' as never,
        updatedAt: { toMillis: () => Date.parse('2026-07-19T00:00:00.000Z') } as never,
      }),
    ],
    isLoading: false,
    isFetching: true,
    isFetchingNextPage: false,
    hasMore: true,
    total: 2,
    filteredTotal: 2,
    summary: {
      global: { total: 2, active: 1, archived: 1, promoted: 1, forRent: 1, forSale: 1, pendingModeration: 1, categoriesUsed: 2 },
      filtered: { total: 2, active: 1, archived: 1, promoted: 1, forRent: 1, forSale: 1, pendingModeration: 1, categoriesUsed: 2 },
    },
    scopeCounts: { immobilier: 2, marketplace: 3 },
    categoryOptions: [
      { id: 'parfums-beaute', label: 'Parfums & beauté', count: 2 },
      { id: 'vetements', label: 'Vêtements', count: 1 },
    ],
    searchInput: 'Akébé',
    setSearchInput: setSearchInputMock,
    filters: {
      scope: 'immobilier', category: '', type: '', status: '', state: '', promoted: '', priceMin: '', priceMax: '', sortBy: 'createdAt', sortOrder: 'desc',
    },
    setScope: setScopeMock,
    setCategoryFilter: setCategoryFilterMock,
    setTypeFilter: jest.fn(),
    setStatusFilter: jest.fn(),
    setStateFilter: jest.fn(),
    setPromotedFilter: jest.fn(),
    setPriceMin: setPriceMinMock,
    setPriceMax: setPriceMaxMock,
    setSort: setSortMock,
    resetFilters: resetFiltersMock,
    hasActiveFilters: true,
    fetchNextPage: fetchNextPageMock,
    toggleAdState: toggleAdStateMock,
    removeAd: removeAdMock,
    isTogglingState: false,
    isRemoving: false,
    error: 'Une synchronisation a échoué.',
    ...overrides,
  }
}

describe('AdManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    toggleAdStateMock.mockResolvedValue(undefined)
    removeAdMock.mockResolvedValue(undefined)
    managementState = buildManagementState()

    class IntersectionObserverMock {
      constructor(private callback: IntersectionObserverCallback) {}
      observe = jest.fn(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never))
      disconnect = jest.fn()
      unobserve = jest.fn()
      takeRecords = jest.fn(() => [])
      root = null
      rootMargin = '320px'
      thresholds = [0]
    }
    Object.defineProperty(global, 'IntersectionObserver', { configurable: true, value: IntersectionObserverMock })
  })

  it('affiche les statistiques, cartes et filtres puis charge la page suivante', async () => {
    render(<AdManagementPage />)

    expect(screen.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()
    expect(screen.getByText('Maison Akébé')).toBeVisible()
    expect(screen.getByText('Terrain Owendo')).toBeVisible()
    expect(screen.getByText(/Motif du rejet : Photo trop sombre/)).toBeVisible()
    expect(screen.getByText('Promotion active')).toBeVisible()
    expect(screen.getByText('Une synchronisation a échoué.')).toBeVisible()
    expect(screen.getByText(/Actualisation en cours/)).toBeVisible()
    await waitFor(() => expect(fetchNextPageMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Recherche'), { target: { value: 'Owendo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Effacer la recherche' }))
    fireEvent.change(screen.getByLabelText('Prix min (FCFA)'), { target: { value: '25000' } })
    fireEvent.change(screen.getByLabelText('Prix max (FCFA)'), { target: { value: '80000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))

    expect(setSearchInputMock).toHaveBeenCalledWith('Owendo')
    expect(setSearchInputMock).toHaveBeenCalledWith('')
    expect(setPriceMinMock).toHaveBeenCalledWith('25000')
    expect(setPriceMaxMock).toHaveBeenCalledWith('80000')
    expect(resetFiltersMock).toHaveBeenCalled()
  })

  it('confirme l archivage et la suppression avec les messages attendus', async () => {
    render(<AdManagementPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Archiver' }))
    const archiveDialog = screen.getByRole('dialog')
    expect(within(archiveDialog).getByRole('heading', { name: 'Archiver cette annonce ?' })).toBeVisible()
    fireEvent.click(within(archiveDialog).getByRole('button', { name: 'Archiver' }))
    await waitFor(() => expect(toggleAdStateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'property-9b' })))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Annonce mise à jour' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    const deleteDialog = screen.getByRole('dialog')
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(removeAdMock).toHaveBeenCalledWith('property-9b'))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Annonce supprimée' }))
  })

  it('réactive une annonce archivée et permet d annuler la confirmation', async () => {
    managementState = buildManagementState({ items: [property({ id: 'archived', state: 'ARCHIVED' })], hasMore: false, isFetching: false })
    render(<AdManagementPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Activer' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Réactiver cette annonce ?' })).toBeVisible()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toggleAdStateMock).not.toHaveBeenCalled()
  })

  it('rend les états chargement, vide et session indisponible', () => {
    managementState = buildManagementState({
      userUid: null,
      items: [],
      isLoading: true,
      isFetching: false,
      hasMore: false,
      error: null,
    })
    const { rerender } = render(<AdManagementPage />)
    expect(document.querySelectorAll('[class*="h-[390px]"]')).toHaveLength(6)
    expect(screen.getByText(/Session indisponible/)).toBeVisible()

    managementState = buildManagementState({ items: [], isLoading: false, isFetching: false, hasMore: false, error: null })
    rerender(<AdManagementPage />)
    expect(screen.getByRole('heading', { name: 'Aucune annonce trouvée' })).toBeVisible()
  })

  it('affiche les deux onglets avec leur nombre d annonces', () => {
    render(<AdManagementPage />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toHaveTextContent('Immobilier')
    expect(tabs[0]).toHaveTextContent('2')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveTextContent('Annonces')
    expect(tabs[1]).toHaveTextContent('3')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')

    fireEvent.click(tabs[1])
    expect(setScopeMock).toHaveBeenCalledWith('marketplace')
  })

  it('montre les filtres et stats immobilier sur l onglet immobilier', () => {
    render(<AdManagementPage />)

    expect(screen.getByLabelText('Type de bien')).toBeInTheDocument()
    expect(screen.getByLabelText("Statut de l'annonce")).toBeInTheDocument()
    expect(screen.queryByLabelText('Catégorie')).not.toBeInTheDocument()

    // Les libellés « À louer »/« À vendre » existent aussi en badge sur les cartes : on vise
    // le panneau de statistiques pour ne tester que lui.
    const stats = within(screen.getByRole('tabpanel'))
    expect(stats.getByText('À louer')).toBeVisible()
    expect(stats.getByText('À vendre')).toBeVisible()
    expect(stats.queryByText('En modération')).not.toBeInTheDocument()
  })

  it('bascule filtres et stats sur l onglet marketplace', () => {
    // Type de bien et louer/vendre n'existent pas hors immobilier : les laisser afficherait
    // des filtres sans effet et des compteurs bloqués à zéro.
    managementState = buildManagementState({
      filters: { ...buildManagementState().filters, scope: 'marketplace' },
    })
    render(<AdManagementPage />)

    expect(screen.getByLabelText('Catégorie')).toBeInTheDocument()
    expect(screen.queryByLabelText('Type de bien')).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Statut de l'annonce")).not.toBeInTheDocument()

    const stats = within(screen.getByRole('tabpanel'))
    expect(stats.getByText('En modération')).toBeVisible()
    expect(stats.getByText('Catégories')).toBeVisible()
    expect(stats.queryByText('À louer')).not.toBeInTheDocument()
    expect(stats.queryByText('À vendre')).not.toBeInTheDocument()
  })

  it('affiche une annonce multi-categorie (sans typeProperty) avec son sous-titre, sa localisation et son lien de modification', () => {
    managementState = buildManagementState({
      items: [
        property({
          id: 'property-mode-9b',
          title: 'Robe wax élégante',
          typeProperty: undefined,
          categoryId: 'vetements',
          categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Vêtements' },
          street: '',
          city: 'Libreville',
          province: 'Estuaire',
        }),
      ],
    })
    render(<AdManagementPage />)

    // La catégorie apparaît deux fois : en badge (à la place de « À vendre », qui n'a pas de
    // sens hors immobilier) et en sous-titre de la carte.
    expect(screen.getAllByText('Vêtements')).toHaveLength(2)
    // Une seule occurrence restante : la carte de statistiques. Le badge de l'annonce, lui,
    // ne dit plus « À vendre ».
    expect(screen.getAllByText('À vendre')).toHaveLength(1)
    expect(screen.getByText('Libreville, Estuaire')).toBeVisible()
    expect(screen.getByRole('link', { name: /Modifier/ })).toHaveAttribute(
      'href',
      '/category-listing/create/preview/property-mode-9b',
    )
  })
})
