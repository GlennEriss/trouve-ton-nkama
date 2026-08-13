import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import ReelsFeedClient, { ReelSlide } from '@/components/reels/ReelsFeedClient'
import type { Reel } from '@/models/reel'

const fetchNextPageMock = jest.fn()
const refetchMock = jest.fn()
const trackViewMock = jest.fn()
const trackLikeMock = jest.fn()
const trackShareMock = jest.fn()
const trackInteractionMock = jest.fn()
const openMock = jest.fn()
const writeTextMock = jest.fn()

let queryState: Record<string, any>
let queryOptions: Record<string, any>
let carouselSelect: (() => void) | undefined
let selectedIndex = 0

const carouselApi = {
  selectedScrollSnap: jest.fn(() => selectedIndex),
  on: jest.fn((_event: string, callback: () => void) => { carouselSelect = callback }),
  off: jest.fn(),
  reInit: jest.fn(),
  scrollPrev: jest.fn(),
  scrollNext: jest.fn(),
}

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (options: Record<string, any>) => {
    queryOptions = options
    return queryState
  },
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

jest.mock('@trouve-ton-nkama/ui/carousel', () => ({
  Carousel: ({ children, setApi }: { children: React.ReactNode; setApi?: (api: unknown) => void }) => {
    React.useEffect(() => { setApi?.(carouselApi) }, [setApi])
    return <div data-testid="carousel">{children}</div>
  },
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}))

jest.mock('@trouve-ton-nkama/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@trouve-ton-nkama/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: ({ alt }: { alt: string }) => <span>{alt}</span>,
}))

jest.mock('@/hooks/use-property', () => ({
  useProperty: (id?: string) => ({
    data: id ? { id, title: 'Maison du réel', price: 65000, city: 'Libreville', contact: '+24166545430' } : undefined,
  }),
}))

jest.mock('@/hooks/use-user-by-uid', () => ({
  useUserByUID: () => ({ data: { firstname: 'Glenn', lastname: 'Eriss', image: '', phoneNumbers: ['+24177112233'] } }),
}))

jest.mock('@/hooks/use-track-property-interaction', () => ({
  useTrackPropertyInteraction: () => ({ trackInteraction: trackInteractionMock }),
}))

jest.mock('@/lib/statistics/reel-statistics.client', () => ({
  trackReelView: (...args: unknown[]) => trackViewMock(...args),
  trackReelLike: (...args: unknown[]) => trackLikeMock(...args),
  trackReelShare: (...args: unknown[]) => trackShareMock(...args),
}))

jest.mock('@/components/reels/ReelAdSlide', () => ({
  __esModule: true,
  default: ({ variant, slotKey }: { variant: string; slotKey: string }) => <div>Pub {variant} {slotKey}</div>,
}))

jest.mock('@/components/reels/gift/GiftModal', () => ({
  __esModule: true,
  default: ({ isOpen, reelId, onClose }: { isOpen: boolean; reelId: string; onClose: () => void }) => (
    isOpen ? <div role="dialog">Cadeau {reelId}<button type="button" onClick={onClose}>Fermer cadeau</button></div> : null
  ),
}))

function reel(index: number, overrides: Partial<Reel> = {}): Reel & { id: string } {
  return {
    id: `reel-${index}`,
    propertyId: `property-${index}`,
    createdBy: 'owner-9b',
    contact: '+24166545430',
    description: `Visite du logement numéro ${index}`,
    processingStatus: 'ready',
    rawVideoPath: `reels/raw/reel-${index}.mp4`,
    videoUrl: `https://example.com/reel-${index}.mp4`,
    thumbnailUrl: `https://example.com/reel-${index}.jpg`,
    moderationStatus: 'APPROVED',
    viewCount: index * 10,
    likeCount: index,
    shareCount: index,
    giftCount: index,
    giftTotalAmount: index * 100,
    state: 'IN_PROGRESS',
    createdAt: { seconds: 1_752_883_200, nanoseconds: 0 } as never,
    updatedAt: { seconds: 1_752_883_200, nanoseconds: 0 } as never,
    ...overrides,
  }
}

function loadedState(reels: Array<Reel & { id: string }>, overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ reels, nextCursor: null }] },
    isLoading: false,
    isError: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: fetchNextPageMock,
    refetch: refetchMock,
    ...overrides,
  }
}

describe('ReelsFeedClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
    selectedIndex = 0
    carouselSelect = undefined
    queryState = loadedState([reel(1), reel(2), reel(3), reel(4)])
    trackLikeMock.mockResolvedValue(undefined)
    trackShareMock.mockResolvedValue(undefined)
    Object.defineProperty(window, 'open', { configurable: true, value: openMock })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: writeTextMock } })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() })),
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: jest.fn().mockResolvedValue(undefined) })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: jest.fn() })
    class MutationObserverMock {
      observe = jest.fn()
      disconnect = jest.fn()
    }
    Object.defineProperty(global, 'MutationObserver', { configurable: true, value: MutationObserverMock })
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: jest.fn().mockResolvedValue({ ok: true, json: async () => ({ reels: [], nextCursor: null }) }),
    })
  })

  it('rend les réels, intercale une pub et termine par le CTA de création', async () => {
    render(<ReelsFeedClient />)

    expect(screen.getByTestId('carousel')).toBeVisible()
    expect(screen.getByText('Pub adsense ad-0')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Mettez votre bien en avant' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Créer un réel' })).toHaveAttribute('href', '/reels/add?returnTo=%2Freels')
    await waitFor(() => expect(trackViewMock).toHaveBeenCalledWith('reel-1'))
    expect(carouselApi.reInit).toHaveBeenCalled()
  })

  it('gère like, WhatsApp, cadeau, partage, son et navigation du carousel', async () => {
    render(<ReelsFeedClient />)

    const likeButtons = screen.getAllByRole('button', { name: "J'aime ce réel" })
    fireEvent.click(likeButtons[0])
    await waitFor(() => expect(trackLikeMock).toHaveBeenCalledWith('reel-1', true))
    expect(window.localStorage.getItem('ttn-liked-reels')).toContain('reel-1')

    fireEvent.click(screen.getAllByRole('button', { name: 'Contacter via WhatsApp' })[0])
    expect(trackInteractionMock).toHaveBeenCalledWith('whatsapp_contact', { phoneNumber: '+24166545430' })
    expect(openMock).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank')

    fireEvent.click(screen.getAllByRole('button', { name: 'Offrir un cadeau' })[0])
    expect(screen.getByRole('dialog')).toHaveTextContent('Cadeau reel-1')
    fireEvent.click(screen.getByRole('button', { name: 'Fermer cadeau' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Copier le lien' })[0])
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/reels/reel-1'))
    expect(trackShareMock).toHaveBeenCalledWith('reel-1', 'copy')

    fireEvent.click(screen.getAllByRole('button', { name: 'Activer le son' })[0])
    expect(screen.getAllByRole('button', { name: 'Couper le son' }).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Réel suivant' }))
    expect(carouselApi.scrollNext).toHaveBeenCalled()
  })

  it('précharge la suite quand le carousel approche de la fin', async () => {
    queryState = loadedState([reel(1), reel(2), reel(3), reel(4), reel(5)], { hasNextPage: true })
    render(<ReelsFeedClient />)
    selectedIndex = 5
    act(() => carouselSelect?.())

    await waitFor(() => expect(fetchNextPageMock).toHaveBeenCalled())
    expect(trackViewMock).toHaveBeenCalledWith('reel-5')
  })

  it('restaure le like local quand le serveur refuse la mutation', async () => {
    trackLikeMock.mockRejectedValueOnce(new Error('API indisponible'))
    render(<ReelsFeedClient />)
    fireEvent.click(screen.getAllByRole('button', { name: "J'aime ce réel" })[0])

    await waitFor(() => expect(window.localStorage.getItem('ttn-liked-reels')).toBe('[]'))
    expect(screen.getAllByRole('button', { name: "J'aime ce réel" }).length).toBeGreaterThan(0)
  })

  it('rend le chargement, l erreur récupérable et l état vide', () => {
    queryState = loadedState([], { isLoading: true })
    const { rerender } = render(<ReelsFeedClient />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()

    queryState = loadedState([], { isError: true })
    rerender(<ReelsFeedClient />)
    expect(screen.getByText('Impossible de charger les réels')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(refetchMock).toHaveBeenCalled()

    queryState = loadedState([])
    rerender(<ReelsFeedClient />)
    expect(screen.getByText('Aucun réel pour le moment')).toBeVisible()
  })

  it('construit la requête paginée et traduit une erreur HTTP', async () => {
    render(<ReelsFeedClient />)
    await queryOptions.queryFn({ pageParam: 'cursor-9b' })
    expect(global.fetch).toHaveBeenCalledWith('/api/reels/feed?limitPerPage=10&cursor=cursor-9b')
    expect(queryOptions.getNextPageParam({ nextCursor: 'next' })).toBe('next')
    expect(queryOptions.getNextPageParam({ nextCursor: null })).toBeUndefined()

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    await expect(queryOptions.queryFn({ pageParam: null })).rejects.toThrow('Impossible de charger les réels.')
  })
})

describe('ReelSlide', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: jest.fn().mockResolvedValue(undefined) })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: jest.fn() })
  })

  it('affiche les informations liées et commande la lecture active', () => {
    const onToggleMute = jest.fn()
    const { rerender } = render(
      <ReelSlide reel={reel(7)} isActive isMuted onToggleMute={onToggleMute} onGiftClick={jest.fn()} />,
    )
    const video = document.querySelector('video')!
    expect(video).toHaveAttribute('preload', 'auto')
    expect(screen.getByText('Maison du réel')).toBeVisible()
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    fireEvent.click(video)
    expect(onToggleMute).toHaveBeenCalled()

    rerender(<ReelSlide reel={reel(7)} isActive={false} isMuted={false} onToggleMute={onToggleMute} onGiftClick={jest.fn()} hasBeenViewed />)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(video).toHaveAttribute('preload', 'auto')
  })
})
