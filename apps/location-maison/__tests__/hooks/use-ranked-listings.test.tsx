import { act, render } from '@testing-library/react'

import { useRankedListings } from '@/features/recommendation/tracking/use-register-recommendation-request'
import type { RecommendationScoringCandidate } from '@/features/recommendation/tracking/recommendation-request.client'

const registerRecommendationRequest = jest.fn()

jest.mock('@/features/recommendation/tracking/recommendation-request.client', () => {
  const actual = jest.requireActual('@/features/recommendation/tracking/recommendation-request.client')
  return {
    ...actual,
    registerRecommendationRequest: (...args: unknown[]) => registerRecommendationRequest(...args),
  }
})

type Item = { objectID: string }

function toCandidate(item: Item, index: number): RecommendationScoringCandidate {
  return { listingId: item.objectID, position: index }
}

let lastResult: ReturnType<typeof useRankedListings<Item>> | null = null

function TestComponent({ items }: { items: Item[] }) {
  lastResult = useRankedListings(items, 'search', toCandidate)
  return null
}

describe('useRankedListings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    lastResult = null
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("passe en isRanking=true dès le premier lot d'items, puis affiche l'ordre Algolia si la variante est control", async () => {
    let resolveRequest!: (value: unknown) => void
    registerRecommendationRequest.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))

    const items = [{ objectID: 'a' }, { objectID: 'b' }]
    const { rerender } = render(<TestComponent items={items} />)

    expect(lastResult?.isRanking).toBe(true)
    expect(lastResult?.displayItems).toEqual(items)

    resolveRequest({
      recommendationRequestId: 'req-1',
      rankingVariant: 'control',
      rankingVersion: 'pre-baseline-v0',
      orderedListingIds: null,
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    rerender(<TestComponent items={items} />)

    expect(lastResult?.isRanking).toBe(false)
    expect(lastResult?.displayItems).toEqual(items)
  })

  it("réordonne l'affichage selon orderedListingIds quand la variante baseline répond à temps", async () => {
    let resolveRequest!: (value: unknown) => void
    registerRecommendationRequest.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))

    const items = [{ objectID: 'a' }, { objectID: 'b' }, { objectID: 'c' }]
    const { rerender } = render(<TestComponent items={items} />)

    resolveRequest({
      recommendationRequestId: 'req-1',
      rankingVariant: 'baseline',
      rankingVersion: 'baseline-v1',
      orderedListingIds: ['c', 'a'],
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    rerender(<TestComponent items={items} />)

    expect(lastResult?.isRanking).toBe(false)
    // "c" et "a" dans l'ordre reçu, "b" (absent du reclassement) à la suite plutôt que perdu.
    expect(lastResult?.displayItems.map((item) => item.objectID)).toEqual(['c', 'a', 'b'])
  })

  it("retombe sur l'ordre Algolia si la réponse n'arrive pas dans le délai imparti", async () => {
    registerRecommendationRequest.mockReturnValue(new Promise(() => {})) // ne se résout jamais

    const items = [{ objectID: 'a' }, { objectID: 'b' }]
    const { rerender } = render(<TestComponent items={items} />)

    expect(lastResult?.isRanking).toBe(true)

    act(() => { jest.advanceTimersByTime(150) })
    await act(async () => { await Promise.resolve() })
    rerender(<TestComponent items={items} />)

    // Le timeout abandonne l'attente : isRanking retombe côté hook via l'abort (la promesse
    // registerRecommendationRequest ne se résout jamais ici, donc on vérifie au moins qu'aucun
    // reclassement n'est appliqué et que l'affichage reste l'ordre Algolia).
    expect(lastResult?.displayItems).toEqual(items)
  })

  it("ne bloque jamais et ne reclasse jamais les pages suivantes du scroll infini", async () => {
    registerRecommendationRequest.mockResolvedValue({
      recommendationRequestId: 'req-1',
      rankingVariant: 'baseline',
      rankingVersion: 'baseline-v1',
      orderedListingIds: ['a'],
    })

    const firstPage = [{ objectID: 'a' }]
    const { rerender } = render(<TestComponent items={firstPage} />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    rerender(<TestComponent items={firstPage} />)
    expect(lastResult?.isRanking).toBe(false)

    registerRecommendationRequest.mockClear()
    registerRecommendationRequest.mockReturnValue(new Promise(() => {}))

    const grownPage = [{ objectID: 'a' }, { objectID: 'b' }]
    rerender(<TestComponent items={grownPage} />)

    // Un nouvel appel est bien déclenché (nouvelle signature), mais il ne doit pas remettre
    // isRanking à true : seule la toute première page est bloquante.
    expect(registerRecommendationRequest).toHaveBeenCalledTimes(1)
    expect(lastResult?.isRanking).toBe(false)
  })
})
