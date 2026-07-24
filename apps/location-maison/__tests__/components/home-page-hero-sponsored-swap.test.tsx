import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import HomeHeroSponsoredSwap from '@/components/home-page/HomeHeroSponsoredSwap'

const trackAdEvent = jest.fn()

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img alt={props.alt} /> }))
jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    { get: (_t, tag) => ({ children, ...props }: any) => React.createElement(tag as string, props, children) },
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))
jest.mock('@/components/ads/AdCreativeCard', () => ({
  __esModule: true,
  default: ({ creative, onClick }: any) => (
    <button onClick={onClick} data-testid="ad-creative">
      {creative.campaignId}
    </button>
  ),
}))
jest.mock('@/lib/statistics/ad-tracking.client', () => ({
  trackAdEvent: (...args: unknown[]) => trackAdEvent(...args),
}))

function fetchOk(creatives: any[]) {
  return { ok: true, json: async () => ({ creatives }) }
}

describe('HomeHeroSponsoredSwap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('affiche la vitrine plateforme par defaut sans campagne', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(fetchOk([]))
    render(<HomeHeroSponsoredSwap />)
    expect(screen.getByText(/La référence immobilière au Gabon/)).toBeInTheDocument()
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/advertising/active?placement=home&all=1'))
  })

  it('reste sur la vitrine plateforme si la requete echoue', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    render(<HomeHeroSponsoredSwap />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.getByText(/La référence immobilière au Gabon/)).toBeInTheDocument()
  })

  it('bascule sur la creative sponsorisee et trace une impression unique', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      fetchOk([{ campaignId: 'camp-1' }]),
    )
    render(<HomeHeroSponsoredSwap />)

    // Laisse la chaine de promesses du fetch (microtaches) se resoudre sous timers factices.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await jest.advanceTimersByTimeAsync(7000)
    })

    expect(screen.getByTestId('ad-creative')).toBeInTheDocument()
    expect(trackAdEvent).toHaveBeenCalledWith('impression', 'camp-1', 'home-hero')
    expect(trackAdEvent).toHaveBeenCalledTimes(1)
  })

  it('trace un clic sur la creative sponsorisee', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(fetchOk([{ campaignId: 'camp-2' }]))
    render(<HomeHeroSponsoredSwap />)

    await act(async () => {
      await jest.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await jest.advanceTimersByTimeAsync(7000)
    })

    expect(screen.getByTestId('ad-creative')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('ad-creative'))
    expect(trackAdEvent).toHaveBeenCalledWith('click', 'camp-2', 'home-hero')
  })

  it('ne demarre pas la rotation quand reduceMotion est actif et une seule creative', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(fetchOk([]))
    render(<HomeHeroSponsoredSwap reduceMotion />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    jest.useFakeTimers()
    act(() => {
      jest.advanceTimersByTime(20000)
    })
    jest.useRealTimers()
    expect(screen.getByText(/La référence immobilière au Gabon/)).toBeInTheDocument()
  })
})
