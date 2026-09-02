import React from 'react'
import { act, render } from '@testing-library/react'

import AdSenseBlock from '@/components/ads/AdSenseBlock'

let sessionState: { data: unknown; status: string }
let pathname: string

jest.mock('next-auth/react', () => ({
  useSession: () => sessionState,
}))
jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))
jest.mock('@/lib/ads/config', () => ({ ADSENSE_CLIENT: 'ca-pub-test' }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn() }) }))
jest.mock('@/features/analytics/ads/services/ads-slot-analytics.client', () => ({
  emitAdsSlotEvent: jest.fn(),
}))

describe('AdSenseBlock', () => {
  let push: jest.Mock

  beforeEach(() => {
    push = jest.fn()
    ;(window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push } as unknown as {
      push: jest.Mock
    }
    sessionState = { data: null, status: 'loading' }
    pathname = '/search'
  })

  afterEach(() => {
    delete (window as { adsbygoogle?: unknown }).adsbygoogle
  })

  it('ne pousse la publicite qu une seule fois meme quand useSession resout apres le montage', () => {
    // Bug reel corrige le 2026-09-02 : useSession() resout de facon asynchrone apres le
    // montage (loading -> authenticated). uid/isAuthenticated etaient dans le tableau de
    // dependances de l'effet principal, qui relancait donc un second adsbygoogle.push({}) sur
    // le MEME noeud <ins> (slotKey/pathname inchances, React ne le demonte pas) — exactement
    // l'erreur "already have ads in them" observee en prod.
    const { rerender } = render(<AdSenseBlock slot="123" slotKey="test-slot" />)
    expect(push).toHaveBeenCalledTimes(1)

    sessionState = { data: { user: { uid: 'user-1' } }, status: 'authenticated' }
    act(() => {
      rerender(<AdSenseBlock slot="123" slotKey="test-slot" />)
    })

    expect(push).toHaveBeenCalledTimes(1)
  })

  it('ne pousse pas une seconde fois sur un noeud deja filled/unfilled (garde StrictMode/relance)', () => {
    // L'ancienne garde comparait data-ad-status a 'done', une valeur que Google ne pose
    // jamais (seulement 'filled'/'unfilled', voir globals.css) — elle ne bloquait donc jamais
    // rien. Simule un second passage de l'effet (ex. relance StrictMode, ou pathname qui change
    // sans que slotKey change) sur un noeud deja traite par Google.
    const { container, rerender } = render(<AdSenseBlock slot="123" slotKey="test-slot" />)
    expect(push).toHaveBeenCalledTimes(1)

    const ins = container.querySelector('ins.adsbygoogle') as HTMLModElement
    ins.setAttribute('data-ad-status', 'filled')

    pathname = '/search?query=studio'
    act(() => {
      rerender(<AdSenseBlock slot="123" slotKey="test-slot" />)
    })

    expect(push).toHaveBeenCalledTimes(1)
  })

  it('pousse a nouveau pour un nouveau slot (slotKey different -> nouveau noeud <ins>)', () => {
    const { rerender } = render(<AdSenseBlock slot="123" slotKey="slot-a" />)
    expect(push).toHaveBeenCalledTimes(1)

    act(() => {
      rerender(<AdSenseBlock slot="123" slotKey="slot-b" />)
    })

    expect(push).toHaveBeenCalledTimes(2)
  })
})
