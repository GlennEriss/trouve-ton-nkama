import { render } from '@testing-library/react'

import { useRecommendationImpression, type UseRecommendationImpressionInput } from '@/hooks/use-recommendation-impression'

const trackRecommendationEvent = jest.fn()

jest.mock('@/features/recommendation/tracking/recommendation-tracking.client', () => ({
  trackRecommendationEvent: (...args: unknown[]) => trackRecommendationEvent(...args),
}))

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void

let observerCallback: ObserverCallback
let observeSpy: jest.Mock
let disconnectSpy: jest.Mock

class ObserverMock {
  constructor(callback: ObserverCallback) {
    observerCallback = callback
  }
  observe = observeSpy
  disconnect = disconnectSpy
  unobserve = jest.fn()
}

function baseInput(overrides: Partial<UseRecommendationImpressionInput> = {}): UseRecommendationImpressionInput {
  return {
    recommendationRequestId: 'req-1',
    listingId: 'listing-1',
    position: 0,
    rankingVariant: 'control',
    rankingVersion: 'pre-baseline-v0',
    ...overrides,
  }
}

function TestCard(props: UseRecommendationImpressionInput) {
  const ref = useRecommendationImpression(props)
  return <div ref={ref} data-testid="card" />
}

function mount(overrides: Partial<UseRecommendationImpressionInput> = {}) {
  return render(<TestCard {...baseInput(overrides)} />)
}

describe('useRecommendationImpression', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    trackRecommendationEvent.mockClear()
    observeSpy = jest.fn()
    disconnectSpy = jest.fn()
    global.IntersectionObserver = ObserverMock as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("n'envoie rien tant que la carte n'a pas été visible", () => {
    mount()
    expect(trackRecommendationEvent).not.toHaveBeenCalled()
  })

  it("n'envoie pas d'impression avant 1 seconde de visibilité continue", () => {
    mount()
    observerCallback([{ isIntersecting: true, intersectionRatio: 1 }])
    jest.advanceTimersByTime(900)
    expect(trackRecommendationEvent).not.toHaveBeenCalled()
  })

  it('envoie une impression après 1 seconde de visibilité continue à au moins 50 %', () => {
    mount()
    observerCallback([{ isIntersecting: true, intersectionRatio: 0.6 }])
    jest.advanceTimersByTime(1000)

    expect(trackRecommendationEvent).toHaveBeenCalledTimes(1)
    expect(trackRecommendationEvent).toHaveBeenCalledWith({
      eventName: 'recommendation_impression',
      recommendationRequestId: 'req-1',
      listingId: 'listing-1',
      position: 0,
      rankingVariant: 'control',
      rankingVersion: 'pre-baseline-v0',
    })
  })

  it('ne compte pas une visibilité en dessous du seuil de 50 %', () => {
    mount()
    observerCallback([{ isIntersecting: true, intersectionRatio: 0.2 }])
    jest.advanceTimersByTime(1000)
    expect(trackRecommendationEvent).not.toHaveBeenCalled()
  })

  it('réinitialise le minuteur si la carte sort du viewport avant la seconde', () => {
    mount()
    observerCallback([{ isIntersecting: true, intersectionRatio: 1 }])
    jest.advanceTimersByTime(700)
    observerCallback([{ isIntersecting: false, intersectionRatio: 0 }])
    jest.advanceTimersByTime(300)

    expect(trackRecommendationEvent).not.toHaveBeenCalled()

    // Redevient visible : le minuteur repart de zéro, pas de crédit pour les 700ms précédentes.
    observerCallback([{ isIntersecting: true, intersectionRatio: 1 }])
    jest.advanceTimersByTime(999)
    expect(trackRecommendationEvent).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(trackRecommendationEvent).toHaveBeenCalledTimes(1)
  })

  it("n'envoie qu'une seule impression même si la visibilité oscille après le premier déclenchement", () => {
    mount()
    observerCallback([{ isIntersecting: true, intersectionRatio: 1 }])
    jest.advanceTimersByTime(1000)
    expect(trackRecommendationEvent).toHaveBeenCalledTimes(1)

    observerCallback([{ isIntersecting: false, intersectionRatio: 0 }])
    observerCallback([{ isIntersecting: true, intersectionRatio: 1 }])
    jest.advanceTimersByTime(2000)

    expect(trackRecommendationEvent).toHaveBeenCalledTimes(1)
  })

  it("ne s'active pas tant qu'aucun recommendationRequestId n'est fourni", () => {
    mount({ recommendationRequestId: undefined })
    expect(observeSpy).not.toHaveBeenCalled()
  })
})
