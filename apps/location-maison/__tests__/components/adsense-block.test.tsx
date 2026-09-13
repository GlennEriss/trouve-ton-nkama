import React from 'react'
import { act, render } from '@testing-library/react'

import AdSenseBlock from '@/components/ads/AdSenseBlock'
import { emitAdsSlotEvent } from '@/features/analytics/ads/services/ads-slot-analytics.client'

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

const emitAdsSlotEventMock = emitAdsSlotEvent as jest.Mock

type FakeEntry = { isIntersecting: boolean; intersectionRatio: number }

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  callback: (entries: FakeEntry[]) => void
  disconnect = jest.fn()
  observe = jest.fn()

  constructor(callback: (entries: FakeEntry[]) => void) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }

  trigger(entry: FakeEntry) {
    this.callback([entry])
  }
}

function eventNamesEmitted() {
  return emitAdsSlotEventMock.mock.calls.map((call) => call[0].eventName)
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

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

describe('AdSenseBlock — vue visible distincte de "filled" (audit §5.2)', () => {
  let push: jest.Mock
  let originalIntersectionObserver: typeof IntersectionObserver | undefined

  beforeEach(() => {
    push = jest.fn()
    ;(window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push } as unknown as {
      push: jest.Mock
    }
    sessionState = { data: null, status: 'authenticated' }
    pathname = '/search'

    FakeIntersectionObserver.instances = []
    originalIntersectionObserver = (global as { IntersectionObserver?: typeof IntersectionObserver })
      .IntersectionObserver
    ;(global as { IntersectionObserver?: unknown }).IntersectionObserver = FakeIntersectionObserver

    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    delete (window as { adsbygoogle?: unknown }).adsbygoogle
    ;(global as { IntersectionObserver?: unknown }).IntersectionObserver = originalIntersectionObserver
  })

  it('"filled" emet ad_filled mais pas ad_impression ni ad_viewable_impression par defaut', async () => {
    const { container } = render(<AdSenseBlock slot="123" slotKey="viewable-slot" />)
    const ins = container.querySelector('ins.adsbygoogle') as HTMLModElement

    await act(async () => {
      ins.setAttribute('data-ad-status', 'filled')
    })
    await flushMicrotasks()

    expect(eventNamesEmitted()).toContain('ad_filled')
    expect(eventNamesEmitted()).not.toContain('ad_impression')
    expect(eventNamesEmitted()).not.toContain('ad_viewable_impression')
  })

  it('50% visible pendant moins d une seconde n emet pas de vue', async () => {
    const { container } = render(<AdSenseBlock slot="123" slotKey="viewable-slot" />)
    const ins = container.querySelector('ins.adsbygoogle') as HTMLModElement
    await act(async () => {
      ins.setAttribute('data-ad-status', 'filled')
    })
    await flushMicrotasks()

    const observer = FakeIntersectionObserver.instances[0]
    act(() => {
      observer.trigger({ isIntersecting: true, intersectionRatio: 0.6 })
    })
    act(() => {
      jest.advanceTimersByTime(500)
    })
    act(() => {
      observer.trigger({ isIntersecting: false, intersectionRatio: 0 })
    })
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(eventNamesEmitted()).not.toContain('ad_viewable_impression')
  })

  it('50% visible pendant une seconde continue emet une seule vue', async () => {
    const { container } = render(<AdSenseBlock slot="123" slotKey="viewable-slot" />)
    const ins = container.querySelector('ins.adsbygoogle') as HTMLModElement
    await act(async () => {
      ins.setAttribute('data-ad-status', 'filled')
    })
    await flushMicrotasks()

    const observer = FakeIntersectionObserver.instances[0]
    act(() => {
      observer.trigger({ isIntersecting: true, intersectionRatio: 0.6 })
    })
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(eventNamesEmitted().filter((name) => name === 'ad_viewable_impression')).toHaveLength(1)
  })

  it('sortie puis retour dans le viewport ne duplique pas l evenement', async () => {
    const { container } = render(<AdSenseBlock slot="123" slotKey="viewable-slot" />)
    const ins = container.querySelector('ins.adsbygoogle') as HTMLModElement
    await act(async () => {
      ins.setAttribute('data-ad-status', 'filled')
    })
    await flushMicrotasks()

    const observer = FakeIntersectionObserver.instances[0]
    act(() => {
      observer.trigger({ isIntersecting: true, intersectionRatio: 0.6 })
      jest.advanceTimersByTime(1000)
    })
    expect(eventNamesEmitted().filter((name) => name === 'ad_viewable_impression')).toHaveLength(1)

    act(() => {
      observer.trigger({ isIntersecting: false, intersectionRatio: 0 })
      observer.trigger({ isIntersecting: true, intersectionRatio: 0.6 })
      jest.advanceTimersByTime(1000)
    })

    expect(eventNamesEmitted().filter((name) => name === 'ad_viewable_impression')).toHaveLength(1)
  })

  it('demontage nettoie IntersectionObserver et le minuteur en cours', async () => {
    const { container, unmount } = render(<AdSenseBlock slot="123" slotKey="viewable-slot" />)
    const ins = container.querySelector('ins.adsbygoogle') as HTMLModElement
    await act(async () => {
      ins.setAttribute('data-ad-status', 'filled')
    })
    await flushMicrotasks()

    const observer = FakeIntersectionObserver.instances[0]
    act(() => {
      observer.trigger({ isIntersecting: true, intersectionRatio: 0.6 })
    })

    unmount()
    expect(observer.disconnect).toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(eventNamesEmitted()).not.toContain('ad_viewable_impression')
  })

  it('navigation SPA (nouveau slotKey) cree un nouvel observer sans doublon', async () => {
    const { container, rerender } = render(<AdSenseBlock slot="123" slotKey="slot-a" />)
    await act(async () => {
      const ins = container.querySelector('ins.adsbygoogle') as HTMLModElement
      ins.setAttribute('data-ad-status', 'filled')
    })
    await flushMicrotasks()
    expect(FakeIntersectionObserver.instances).toHaveLength(1)

    act(() => {
      rerender(<AdSenseBlock slot="123" slotKey="slot-b" />)
    })

    expect(FakeIntersectionObserver.instances).toHaveLength(2)
    expect(FakeIntersectionObserver.instances[0].disconnect).toHaveBeenCalled()
  })
})
