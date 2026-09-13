'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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

// Décision produit (2026-09-14) : jamais de rendu bloquant sur le reclassement — un délai
// perçu par 100% des sessions (dont 80% en variante control, sans aucun bénéfice) coûtait plus
// cher que le reflow visuel occasionnel de la variante baseline. On affiche l'ordre Algolia
// immédiatement et on réordonne en place si/quand la réponse arrive. Passé ce délai, une réponse
// tardive est ignorée : réordonner longtemps après que l'utilisateur a déjà vu la liste serait
// plus perturbant qu'utile.
const LATE_REORDER_CUTOFF_MS = 2000

export type RankedListingsResult<T> = {
  /** Items dans l'ordre d'affichage : ordre Algolia/Firestore d'origine jusqu'à ce qu'une
   * réponse de reclassement arrive (variante baseline), puis réordonnés en place. */
  displayItems: T[]
  recommendationRequest: RegisteredRecommendationRequest | null
}

export function useRankedListings<T>(
  items: T[],
  context: RecommendationContext | undefined,
  toCandidate: (item: T, index: number) => RecommendationScoringCandidate | null,
  scoringContext?: RecommendationScoringContext,
): RankedListingsResult<T> {
  const [registered, setRegistered] = useState<RegisteredRecommendationRequest | null>(null)
  const lastSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    if (!context) return

    const candidates = items
      .slice(0, MAX_CANDIDATES)
      .map((item, index) => toCandidate(item, index))
      .filter((candidate): candidate is RecommendationScoringCandidate => candidate !== null)

    if (candidates.length === 0) return

    const signature = candidates.map((candidate) => candidate.listingId).join(',')
    if (signature === lastSignatureRef.current) return
    lastSignatureRef.current = signature

    let cancelled = false
    const requestedAt = Date.now()

    void registerRecommendationRequest({ context, candidates, scoringContext }).then((result) => {
      if (cancelled || !result) return
      // Réponse arrivée trop tard : on garde recommendationRequestId pour le tracking (favoris/
      // contact restent corrélés), mais on n'applique plus le reflow visuel à ce stade.
      if (Date.now() - requestedAt > LATE_REORDER_CUTOFF_MS) {
        setRegistered({ ...result, orderedListingIds: null })
        return
      }
      setRegistered(result)
    })

    return () => {
      cancelled = true
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

  return { displayItems, recommendationRequest: registered }
}
