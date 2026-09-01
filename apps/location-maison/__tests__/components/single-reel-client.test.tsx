import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

import SingleReelClient from '@/components/reels/SingleReelClient'
import type { Reel } from '@/models/reel'

const trackReelViewMock = jest.fn()
let searchParamsValue: string | null = null

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => (key === 'returnTo' ? searchParamsValue : null) }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

jest.mock('@/lib/statistics/reel-statistics.client', () => ({
  trackReelView: (...args: unknown[]) => trackReelViewMock(...args),
}))

jest.mock('@/components/reels/gift/GiftModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="gift-modal" /> : null),
}))

// ReelSlide a sa propre suite (reels-feed-client.test.tsx) — mocké ici pour ne tester que le
// comportement propre à SingleReelClient (états de chargement, lien de retour).
jest.mock('@/components/reels/ReelsFeedClient', () => ({
  ReelSlide: ({ reel }: { reel: Reel & { id: string } }) => (
    <div data-testid="reel-slide">{reel.description}</div>
  ),
}))

function reelResponse(overrides: Partial<Reel> = {}): Reel & { id: string } {
  return {
    id: 'reel-1',
    createdBy: 'owner-1',
    propertyId: null,
    description: 'Villa avec piscine.',
    processingStatus: 'ready',
    moderationStatus: 'APPROVED',
    rawVideoPath: 'reels-raw/owner-1/reel-1.mp4',
    videoUrl: 'https://example.com/reel-1.mp4',
    thumbnailUrl: 'https://example.com/reel-1.jpg',
    viewCount: 0,
    likeCount: 0,
    shareCount: 0,
    giftCount: 0,
    giftTotalAmount: 0,
    state: 'IN_PROGRESS',
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    updatedAt: { seconds: 0, nanoseconds: 0 } as never,
    ...overrides,
  }
}

describe('SingleReelClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchParamsValue = null
    global.fetch = jest.fn()
  })

  it('affiche le chargement puis le réel une fois récupéré, et trace la vue', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reel: reelResponse() }),
    })

    render(<SingleReelClient reelId="reel-1" />)
    expect(document.querySelector('.animate-spin')).toBeTruthy()

    await waitFor(() => expect(screen.getByTestId('reel-slide')).toBeInTheDocument())
    expect(screen.getByText('Villa avec piscine.')).toBeVisible()
    expect(global.fetch).toHaveBeenCalledWith('/api/reels/reel-1')
    await waitFor(() => expect(trackReelViewMock).toHaveBeenCalledWith('reel-1'))
  })

  it("affiche un message clair quand le réel n'est plus disponible (404)", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 })

    render(<SingleReelClient reelId="reel-missing" />)

    await waitFor(() => expect(screen.getByText("Ce réel n'est plus disponible.")).toBeVisible())
    expect(trackReelViewMock).not.toHaveBeenCalled()
  })

  it("affiche une erreur générique si la requête échoue autrement", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 })

    render(<SingleReelClient reelId="reel-1" />)

    await waitFor(() => expect(screen.getByText('Impossible de charger ce réel.')).toBeVisible())
  })

  it('le lien de retour pointe vers le fil public par défaut (lien profond WhatsApp, sans returnTo)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reel: reelResponse() }),
    })
    searchParamsValue = null

    render(<SingleReelClient reelId="reel-1" />)

    expect(screen.getByRole('link', { name: /Voir plus de réels/i })).toHaveAttribute('href', '/reels')
    await waitFor(() => expect(screen.getByTestId('reel-slide')).toBeInTheDocument())
  })

  it('respecte ?returnTo=/reels/mine (clic depuis la miniature de "Mes réels")', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reel: reelResponse() }),
    })
    searchParamsValue = '/reels/mine'

    render(<SingleReelClient reelId="reel-1" />)

    expect(screen.getByRole('link', { name: /Voir plus de réels/i })).toHaveAttribute('href', '/reels/mine')
    await waitFor(() => expect(screen.getByTestId('reel-slide')).toBeInTheDocument())
  })

  it('ignore un returnTo hors liste blanche et retombe sur le fil public', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reel: reelResponse() }),
    })
    searchParamsValue = 'https://malicious.example'

    render(<SingleReelClient reelId="reel-1" />)

    expect(screen.getByRole('link', { name: /Voir plus de réels/i })).toHaveAttribute('href', '/reels')
    await waitFor(() => expect(screen.getByTestId('reel-slide')).toBeInTheDocument())
  })
})
