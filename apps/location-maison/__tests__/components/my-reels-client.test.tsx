import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import MyReelsClient from '@/components/reels/MyReelsClient'
import type { Reel } from '@/models/reel'

const getReelsMock = jest.fn()
const deleteReelMock = jest.fn()
const invalidateQueriesMock = jest.fn()
const fetchNextPageMock = jest.fn()
const toastMock = jest.fn()

let currentUser: { uid: string } | null
let firebaseConnected: boolean
let queryState: Record<string, any>
let queryOptions: Record<string, any>

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: currentUser, isFirebaseConnected: firebaseConnected }),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

jest.mock('@/db/reel.db', () => ({
  getReelsByOwner: (...args: unknown[]) => getReelsMock(...args),
  deleteReel: (...args: unknown[]) => deleteReelMock(...args),
}))

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
  useInfiniteQuery: (options: Record<string, any>) => {
    queryOptions = options
    return queryState
  },
  useMutation: (options: Record<string, any>) => ({
    isPending: false,
    mutate: (value: unknown) => {
      void options.mutationFn(value).then(options.onSuccess).catch(options.onError)
    },
  }),
}))

jest.mock('@trouve-ton-nkama/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

// Le vrai Carousel (Embla) ne fonctionne pas en jsdom (matchMedia absent) — même mock que
// ad-management-page.test.tsx, qui a le même besoin pour les stats de /property.
jest.mock('@trouve-ton-nkama/ui/carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function reel(index: number, overrides: Partial<Reel> = {}): Reel & { id: string } {
  return {
    id: `mine-reel-${index}`,
    propertyId: index === 1 ? 'property-1' : null,
    createdBy: 'announcer-reels-9b',
    description: index === 1 ? 'Visite guidée du logement' : undefined,
    processingStatus: 'ready',
    rawVideoPath: `reels/raw/mine-reel-${index}.mp4`,
    videoUrl: `https://example.com/mine-reel-${index}.mp4`,
    thumbnailUrl: index === 1 ? `https://example.com/mine-reel-${index}.jpg` : undefined,
    moderationStatus: index === 1 ? 'APPROVED' : 'PENDING',
    viewCount: index * 100,
    likeCount: index * 10,
    shareCount: index * 2,
    giftCount: 0,
    giftTotalAmount: 0,
    state: 'IN_PROGRESS',
    createdAt: { seconds: 1_752_883_200 + index * 86400, nanoseconds: 0 } as never,
    updatedAt: { seconds: 1_752_883_200, nanoseconds: 0 } as never,
    ...overrides,
  }
}

function state(reels: Array<Reel & { id: string }>, overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ reels, nextCursor: 'next-page' }] },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    fetchNextPage: fetchNextPageMock,
    ...overrides,
  }
}

describe('MyReelsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    currentUser = { uid: 'announcer-reels-9b' }
    firebaseConnected = true
    queryState = state([
      reel(1),
      reel(2, { processingStatus: 'failed', moderationStatus: 'REJECTED' }),
      reel(3, { processingStatus: 'processing', propertyId: null }),
    ])
    getReelsMock.mockResolvedValue({ reels: [reel(1)], nextCursor: null })
    deleteReelMock.mockResolvedValue(undefined)
    invalidateQueriesMock.mockResolvedValue(undefined)

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

  it('affiche les statuts, statistiques agrégées et actions des réels', async () => {
    render(<MyReelsClient />)

    expect(screen.getByRole('heading', { name: 'Mes réels' })).toBeVisible()
    expect(screen.getByText('Approuvé')).toBeVisible()
    expect(screen.getByText('Échec du traitement')).toBeVisible()
    expect(screen.getByText('Traitement en cours')).toBeVisible()
    expect(screen.getAllByText('Sans description').length).toBeGreaterThan(0)
    // Les stats sont dupliquées dans le DOM (grille desktop + carousel mobile, cf.
    // reel-stats-desktop/reel-stats-mobile) — scope au bloc desktop pour éviter l'ambiguïté.
    const stats = within(screen.getByTestId('reel-stats-desktop'))
    expect(stats.getByText('600')).toBeVisible()
    expect(stats.getByText('60')).toBeVisible()
    expect(stats.getByText('12')).toBeVisible()
    expect(screen.getAllByRole('link', { name: /Attacher à une annonce/i }).length).toBeGreaterThan(0)
    // La miniature d'un réel prêt (reel 1, processingStatus 'ready') mène à /reels/{id} — celle
    // d'un réel encore en traitement/échoué (2, 3) ne doit pas être cliquable : tant qu'il n'est
    // pas traité il n'y a pas encore de vidéo à lire (le propriétaire n'a pas besoin
    // d'approbation pour lire un réel déjà prêt, voir /api/reels/[reelId]/route.ts).
    // ?returnTo=/reels/mine : sans lui, "Voir plus de réels" sur la page de lecture ramènerait
    // au fil public au lieu de "Mes réels" (voir SingleReelClient.tsx).
    expect(screen.getByRole('link', { name: 'Lire le réel' })).toHaveAttribute(
      'href',
      '/reels/mine-reel-1?returnTo=%2Freels%2Fmine',
    )
    expect(screen.getAllByRole('link', { name: 'Lire le réel' })).toHaveLength(1)
    await waitFor(() => expect(fetchNextPageMock).toHaveBeenCalled())
  })

  it('applique une période, la transmet à la requête et la réinitialise', async () => {
    render(<MyReelsClient />)
    fireEvent.change(screen.getByLabelText('Publiés depuis le'), { target: { value: '2026-07-01' } })
    fireEvent.change(screen.getByLabelText("Jusqu'au"), { target: { value: '2026-07-20' } })

    expect(screen.getByRole('button', { name: 'Réinitialiser' })).toBeEnabled()
    await queryOptions.queryFn({ pageParam: 'cursor-reels-9b' })
    expect(getReelsMock).toHaveBeenCalledWith('announcer-reels-9b', expect.objectContaining({
      limitPerPage: 12,
      cursor: 'cursor-reels-9b',
      startDate: expect.any(Date),
      endDate: expect.any(Date),
    }))
    expect(queryOptions.getNextPageParam({ nextCursor: 'next' })).toBe('next')
    expect(queryOptions.getNextPageParam({ nextCursor: null })).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    expect(screen.getByLabelText('Publiés depuis le')).toHaveValue('')
    expect(screen.getByLabelText("Jusqu'au")).toHaveValue('')
  })

  it('supprime un réel et invalide la liste ainsi que le feed', async () => {
    render(<MyReelsClient />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    let dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Supprimer ce réel ?' })).toBeVisible()

    // Annuler ferme la confirmation sans supprimer.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteReelMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(deleteReelMock).toHaveBeenCalledWith('mine-reel-1'))
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['reels-mine', 'announcer-reels-9b'] })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['reels-feed'] })
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Réel supprimé' }))
  })

  it('conserve la confirmation ouverte et affiche l erreur de suppression', async () => {
    deleteReelMock.mockRejectedValue(new Error('Storage refuse la suppression'))
    render(<MyReelsClient />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Suppression impossible',
      description: 'Storage refuse la suppression',
      variant: 'destructive',
    })))
  })

  it('rend l attente Firebase puis les deux variantes d état vide', () => {
    firebaseConnected = false
    queryState = state([], { isLoading: false, hasNextPage: false })
    const { rerender } = render(<MyReelsClient />)
    expect(document.querySelectorAll('[class*="h-[360px]"]')).toHaveLength(4)

    firebaseConnected = true
    rerender(<MyReelsClient />)
    expect(screen.getByRole('heading', { name: /Vous n'avez encore créé aucun réel/i })).toBeVisible()

    fireEvent.change(screen.getByLabelText('Publiés depuis le'), { target: { value: '2026-07-01' } })
    expect(screen.getByRole('heading', { name: 'Aucun réel ne correspond à vos filtres' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }))
    expect(screen.getByRole('heading', { name: /Vous n'avez encore créé aucun réel/i })).toBeVisible()
  })

  it('ouvre le Sheet "Filtres" (mobile), applique et réinitialise la période depuis celui-ci', () => {
    render(<MyReelsClient />)

    expect(screen.queryByRole('heading', { name: 'Filtres' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Filtres' }))

    // Les champs du Sheet portent un préfixe d'id ("mobile-") distinct de la grille desktop
    // (toutes deux montées dans le DOM en jsdom, faute de media queries réelles) mais le même
    // libellé — même design que /property (AdManagementPage.tsx) — d'où le scope sur le dialog.
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('heading', { name: 'Filtres' })).toBeVisible()

    fireEvent.change(within(sheet).getByLabelText('Publiés depuis le'), { target: { value: '2026-07-01' } })
    fireEvent.change(within(sheet).getByLabelText("Jusqu'au"), { target: { value: '2026-07-31' } })
    expect(within(sheet).getByRole('button', { name: 'Réinitialiser' })).toBeEnabled()

    fireEvent.click(within(sheet).getByRole('button', { name: 'Réinitialiser' }))
    expect(within(sheet).getByLabelText('Publiés depuis le')).toHaveValue('')

    fireEvent.click(within(sheet).getByRole('button', { name: 'Voir les résultats' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('filtre les réels affichés (et les stats) par le texte de recherche, côté client', () => {
    firebaseConnected = true
    queryState = state([
      reel(1, { description: 'Villa avec piscine à Owendo', viewCount: 10 }),
      reel(2, { description: 'Studio meublé au centre-ville', viewCount: 5 }),
    ])
    render(<MyReelsClient />)

    expect(screen.getByText('Villa avec piscine à Owendo')).toBeVisible()
    expect(screen.getByText('Studio meublé au centre-ville')).toBeVisible()

    fireEvent.change(screen.getByLabelText('Recherche'), { target: { value: 'piscine' } })

    expect(screen.getByText('Villa avec piscine à Owendo')).toBeVisible()
    expect(screen.queryByText('Studio meublé au centre-ville')).not.toBeInTheDocument()
    // Les stats totales ne comptent plus que les réels visibles après recherche.
    // Les stats sont dupliquées dans le DOM (grille desktop + carousel mobile) — scope au bloc
    // desktop pour éviter l'ambiguïté.
    const stats = within(screen.getByTestId('reel-stats-desktop'))
    expect(stats.getByText('Vues totales').closest('div')?.parentElement).toHaveTextContent('10')

    // Barre compacte mobile (<md, masquée par CSS uniquement — toujours montée sous jsdom) :
    // recherche + son bouton "Effacer la recherche" propres, distincts de la section desktop.
    const mobileSearchInput = screen.getAllByPlaceholderText('Rechercher dans la description...')[0]
    fireEvent.change(mobileSearchInput, { target: { value: 'Owendo' } })
    expect(mobileSearchInput).toHaveValue('Owendo')
    fireEvent.click(screen.getAllByRole('button', { name: 'Effacer la recherche' })[0])
    expect(mobileSearchInput).toHaveValue('')
  })

  it('désactive la requête sans utilisateur', () => {
    currentUser = null
    queryState = state([], { data: undefined, hasNextPage: false })
    render(<MyReelsClient />)
    expect(queryOptions.enabled).toBe(false)
  })
})
