'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  registerRecommendationRequest,
  type RecommendationContext,
  type RecommendationScoringCandidate,
  type RecommendationScoringContext,
  type RegisteredRecommendationRequest,
} from './recommendation-request.client'

// Plafond aligné sur celui accepté par /api/recommendations/requests (voir
// apps/location-maison/src/app/api/recommendations/requests/route.ts et le schéma adaptateur
// côté location-maison-admin). Au-delà, les résultats chargés par scroll infini ne sont pas
// suivis en Phase 1/2 — limitation connue, pas un bug (voir docs/recommendation-ml/).
const MAX_CANDIDATES = 50

// Marge réseau au-dessus du NFR serveur (reranking P95 < 100ms, ARCHITECTURE-OVERVIEW.md) : passé
// ce délai, on abandonne l'attente et on garde l'ordre Algolia — jamais de blocage indéfini.
const FIRST_PAGE_TIMEOUT_MS = 150

export type RankedListingsResult<T> = {
  /** Items dans l'ordre final à afficher : reclassés si une variante baseline a répondu à temps,
   * ordre Algolia d'origine sinon (variante control, timeout, ou échec). */
  displayItems: T[]
  /** true uniquement pendant la brève attente du tout premier chargement (jamais pour les pages
   * suivantes du scroll infini, qui ne sont ni bloquantes ni reclassées). */
  isRanking: boolean
  recommendationRequest: RegisteredRecommendationRequest | null
}

export function useRankedListings<T>(
  items: T[],
  context: RecommendationContext | undefined,
  toCandidate: (item: T, index: number) => RecommendationScoringCandidate | null,
  scoringContext?: RecommendationScoringContext,
): RankedListingsResult<T> {
  const [registered, setRegistered] = useState<RegisteredRecommendationRequest | null>(null)
  const [isRanking, setIsRanking] = useState(false)
  const lastSignatureRef = useRef<string | null>(null)
  const hasHandledFirstPageRef = useRef(false)

  // useLayoutEffect (pas useEffect) : pose isRanking=true avant la peinture du premier
  // chargement, pour éviter un flash de l'ordre Algolia non reclassé avant l'état d'attente.
  useLayoutEffect(() => {
    if (!context) return

    const candidates = items
      .slice(0, MAX_CANDIDATES)
      .map((item, index) => toCandidate(item, index))
      .filter((candidate): candidate is RecommendationScoringCandidate => candidate !== null)

    if (candidates.length === 0) return

    const signature = candidates.map((candidate) => candidate.listingId).join(',')
    if (signature === lastSignatureRef.current) return
    lastSignatureRef.current = signature

    const isFirstPage = !hasHandledFirstPageRef.current
    hasHandledFirstPageRef.current = true

    let cancelled = false
    const controller = isFirstPage && typeof AbortController !== 'undefined' ? new AbortController() : undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    if (isFirstPage) {
      setIsRanking(true)
      timeoutId = setTimeout(() => controller?.abort(), FIRST_PAGE_TIMEOUT_MS)
    }

    void registerRecommendationRequest({
      context,
      candidates,
      scoringContext,
      signal: controller?.signal,
    }).then((result) => {
      if (cancelled) return
      if (result) setRegistered(result)
      if (isFirstPage) setIsRanking(false)
    })

    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, context, scoringContext])

  const displayItems = useMemo(() => {
    const orderedListingIds = registered?.orderedListingIds
    if (!orderedListingIds || orderedListingIds.length === 0) {
      return items
    }

    const orderIndex = new Map(orderedListingIds.map((id, index) => [id, index]))
    const withId = items.map((item, index) => ({ item, id: toCandidate(item, index)?.listingId ?? null }))

    const ranked = withId.filter((entry): entry is { item: T; id: string } => entry.id !== null && orderIndex.has(entry.id))
    const unranked = withId.filter((entry) => entry.id === null || !orderIndex.has(entry.id)).map((entry) => entry.item)

    ranked.sort((a, b) => orderIndex.get(a.id)! - orderIndex.get(b.id)!)

    return [...ranked.map((entry) => entry.item), ...unranked]
  }, [items, registered, toCandidate])

  return { displayItems, isRanking, recommendationRequest: registered }
}
