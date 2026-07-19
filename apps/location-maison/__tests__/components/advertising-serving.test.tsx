import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import SponsoredSlot from '@/components/ads/SponsoredSlot'
import ReelAdSlide from '@/components/reels/ReelAdSlide'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

jest.mock('@/components/ads/InlineAdUnit', () => ({
  __esModule: true,
  default: ({ slotKey }: { slotKey: string }) => (
    <div data-testid="adsense-unit">AdSense {slotKey}</div>
  ),
}))

jest.mock('@/components/ads/AdSenseBlock', () => ({
  __esModule: true,
  default: ({ onStatusChange }: { onStatusChange?: (status: string | null) => void }) => (
    <button type="button" onClick={() => onStatusChange?.('unfilled')}>
      Simuler AdSense non rempli
    </button>
  ),
}))

jest.mock('@/components/ads/AdCreativeCard', () => ({
  __esModule: true,
  default: ({
    creative,
    onClick,
  }: {
    creative: { headline?: string }
    onClick?: () => void
  }) => (
    <button type="button" onClick={onClick}>
      {creative.headline ?? 'Publicité maison'}
    </button>
  ),
}))

const creative = {
  campaignId: 'campaign-component-6b',
  placement: 'search_infeed',
  imageURL: 'https://example.com/ad.jpg',
  headline: 'Offre composant 6B',
  ctaUrl: 'https://example.com/offre',
}

const fetchMock = jest.fn()

function successfulJson(payload: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => payload,
  } as Response)
}

function trackedEvents() {
  return fetchMock.mock.calls
    .filter(([url]) => url === '/api/advertising/track')
    .map(([, init]) => JSON.parse(String(init?.body)))
}

describe('Lot 6B - rendu publicitaire', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: fetchMock,
    })
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    })
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/advertising/active')) {
        return successfulJson({ creative })
      }
      return successfulJson({ success: true })
    })
  })

  it('affiche la campagne maison et conserve l unite AdSense independante', async () => {
    const { rerender } = render(
      <SponsoredSlot
        placement="search_infeed"
        province="Estuaire"
        city="Libreville"
        fallbackSlot="123"
        fallbackSlotKey="search-6b"
      />,
    )

    const houseAd = await screen.findByRole('button', { name: creative.headline })
    expect(screen.getByTestId('adsense-unit')).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/advertising/active?placement=search_infeed&province=Estuaire&city=Libreville',
    )
    await waitFor(() => {
      expect(trackedEvents()).toEqual([
        expect.objectContaining({
          event: 'impression',
          campaignId: creative.campaignId,
          placementKey: 'search_infeed',
          visitorId: expect.stringMatching(/^ttn_/),
        }),
      ])
    })

    rerender(
      <SponsoredSlot
        placement="search_infeed"
        province="Estuaire"
        city="Libreville"
        fallbackSlot="123"
        fallbackSlotKey="search-6b"
      />,
    )
    expect(trackedEvents()).toHaveLength(1)

    fireEvent.click(houseAd)
    await waitFor(() => {
      expect(trackedEvents()).toEqual([
        expect.objectContaining({ event: 'impression', campaignId: creative.campaignId }),
        expect.objectContaining({ event: 'click', campaignId: creative.campaignId }),
      ])
    })
  })

  it('garde AdSense sans envoyer de metrique maison quand il n y a pas de campagne', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/advertising/active')) {
        return successfulJson({ creative: null })
      }
      return successfulJson({ success: true })
    })

    render(
      <SponsoredSlot
        placement="property_detail"
        fallbackSlot="456"
        fallbackSlotKey="detail-6b"
      />,
    )

    expect(screen.getByTestId('adsense-unit')).toBeVisible()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/advertising/active?placement=property_detail',
      )
    })
    expect(trackedEvents()).toHaveLength(0)
  })

  it('remplace immediatement un AdSense non rempli dans les reels', () => {
    render(<ReelAdSlide variant="adsense" isActive slotKey="reels-adsense-6b" />)

    fireEvent.click(screen.getByRole('button', { name: /Simuler AdSense non rempli/i }))

    expect(screen.getByRole('heading', { name: /Votre bien peut être vu ici/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /Faire de la pub/i })).toBeVisible()
  })

  it('compte la campagne reels seulement quand sa diapositive devient active', async () => {
    const reelsCreative = {
      ...creative,
      placement: 'reels_infeed',
      headline: 'Campagne réels 6B',
    }
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/advertising/active')) {
        return successfulJson({ creative: reelsCreative })
      }
      return successfulJson({ success: true })
    })

    const { rerender } = render(
      <ReelAdSlide variant="house" isActive={false} slotKey="reels-house-6b" />,
    )

    const houseAd = await screen.findByRole('button', { name: reelsCreative.headline })
    expect(trackedEvents()).toHaveLength(0)

    rerender(<ReelAdSlide variant="house" isActive slotKey="reels-house-6b" />)
    await waitFor(() => {
      expect(trackedEvents()).toEqual([
        expect.objectContaining({
          event: 'impression',
          campaignId: reelsCreative.campaignId,
          placementKey: 'reels:reels-house-6b',
        }),
      ])
    })

    fireEvent.click(houseAd)
    await waitFor(() => {
      expect(trackedEvents()).toHaveLength(2)
      expect(trackedEvents()[1]).toEqual(expect.objectContaining({
        event: 'click',
        campaignId: reelsCreative.campaignId,
        placementKey: 'reels:reels-house-6b',
      }))
    })
  })
})
