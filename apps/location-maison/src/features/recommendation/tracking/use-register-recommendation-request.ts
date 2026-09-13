'use client'

import { useEffect, useRef, useState } from 'react'

import {
  registerRecommendationRequest,
  type RecommendationContext,
  type RegisteredRecommendationRequest,
} from './recommendation-request.client'

// Plafond aligné sur celui accepté par /api/recommendations/requests (voir
// apps/location-maison/src/app/api/recommendations/requests/route.ts et le schéma adaptateur
// côté location-maison-admin). Au-delà, les résultats chargés par scroll infini ne sont pas
// suivis en Phase 1 — limitation connue, pas un bug (voir docs/recommendation-ml/).
const MAX_CANDIDATES = 50

function extractListingId(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null
  const record = item as Record<string, unknown>
  const raw = record.objectID ?? record.id ?? null
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

// Enregistre (et ré-enregistre si la liste chargée change réellement) la liste servie auprès de
// /api/recommendations/requests, sans jamais modifier l'ordre Algolia existant (Phase 1 =
// collecte seule). Le résultat alimente RecommendationRequestProvider.
export function useRegisterRecommendationRequest(
  items: unknown[],
  context: RecommendationContext | undefined,
): RegisteredRecommendationRequest | null {
  const [registered, setRegistered] = useState<RegisteredRecommendationRequest | null>(null)
  const lastSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    if (!context) {
      return
    }

    const candidates = items
      .slice(0, MAX_CANDIDATES)
      .map((item, index) => {
        const listingId = extractListingId(item)
        return listingId ? { listingId, position: index } : null
      })
      .filter((candidate): candidate is { listingId: string; position: number } => candidate !== null)

    if (candidates.length === 0) {
      return
    }

    const signature = candidates.map((candidate) => candidate.listingId).join(',')
    if (signature === lastSignatureRef.current) {
      return
    }
    lastSignatureRef.current = signature

    let cancelled = false
    void registerRecommendationRequest({ context, candidates }).then((result) => {
      if (!cancelled && result) {
        setRegistered(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [items, context])

  return registered
}
