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

  it("affiche l'ordre Algolia immédiatement, sans attendre la réponse du serveur", () => {
    registerRecommendationRequest.mockReturnValue(new Promise(() => {})) // ne se résout jamais

    const items = [{ objectID: 'a' }, { objectID: 'b' }]
    render(<TestComponent items={items} />)

    // Aucun blocage : l'ordre d'origine est affiché dès le premier rendu.
    expect(lastResult?.displayItems).toEqual(items)
  })

  it("réordonne en place quand la variante baseline répond (reflow accepté, pas d'attente)", async () => {
    let resolveRequest!: (value: unknown) => void
    registerRecommendationRequest.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))

    const items = [{ objectID: 'a' }, { objectID: 'b' }, { objectID: 'c' }]
    const { rerender } = render(<TestComponent items={items} />)

    expect(lastResult?.displayItems.map((item) => item.objectID)).toEqual(['a', 'b', 'c'])

    await act(async () => {
      resolveRequest({
        recommendationRequestId: 'req-1',
        rankingVariant: 'baseline',
        rankingVersion: 'baseline-v1',
        orderedListingIds: ['c', 'a'],
      })
      await Promise.resolve()
      await Promise.resolve()
    })
    rerender(<TestComponent items={items} />)

    // "c" et "a" dans l'ordre reçu, "b" (absent du reclassement) à la suite plutôt que perdu.
    expect(lastResult?.displayItems.map((item) => item.objectID)).toEqual(['c', 'a', 'b'])
  })

  it('garde l’ordre Algolia quand la variante est control (orderedListingIds=null)', async () => {
    registerRecommendationRequest.mockResolvedValue({
      recommendationRequestId: 'req-1',
      rankingVariant: 'control',
      rankingVersion: 'pre-baseline-v0',
      orderedListingIds: null,
    })

    const items = [{ objectID: 'a' }, { objectID: 'b' }]
    const { rerender } = render(<TestComponent items={items} />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    rerender(<TestComponent items={items} />)

    expect(lastResult?.displayItems).toEqual(items)
  })

  it('ignore une réponse arrivée trop tard (au-delà de la fenêtre de grâce)', async () => {
    let resolveRequest!: (value: unknown) => void
    registerRecommendationRequest.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))

    const items = [{ objectID: 'a' }, { objectID: 'b' }]
    const { rerender } = render(<TestComponent items={items} />)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    await act(async () => {
      resolveRequest({
        recommendationRequestId: 'req-1',
        rankingVariant: 'baseline',
        rankingVersion: 'baseline-v1',
        orderedListingIds: ['b', 'a'],
      })
      await Promise.resolve()
      await Promise.resolve()
    })
    rerender(<TestComponent items={items} />)

    // Réponse ignorée pour l'affichage (trop tardive) : ordre Algolia inchangé, mais le
    // recommendationRequestId reste disponible pour le tracking.
    expect(lastResult?.displayItems).toEqual(items)
    expect(lastResult?.recommendationRequest?.recommendationRequestId).toBe('req-1')
  })

  it('ne perturbe pas l’affichage sur les pages suivantes du scroll infini', async () => {
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

    registerRecommendationRequest.mockClear()
    registerRecommendationRequest.mockReturnValue(new Promise(() => {}))

    const grownPage = [{ objectID: 'a' }, { objectID: 'b' }]
    rerender(<TestComponent items={grownPage} />)

    // Un nouvel appel est bien déclenché (nouvelle signature, journalisation Phase 1 inchangée),
    // et le nouvel item apparaît immédiatement sans attendre sa réponse.
    expect(registerRecommendationRequest).toHaveBeenCalledTimes(1)
    expect(lastResult?.displayItems.map((item) => item.objectID)).toEqual(['a', 'b'])
  })
})
