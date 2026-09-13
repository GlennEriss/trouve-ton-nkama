'use client'

import { useEffect, useRef } from 'react'

import { trackRecommendationEvent } from '@/features/recommendation/tracking/recommendation-tracking.client'

// Définition d'impression de la doc (AVANT-IMPLEMENTATION.md §3) : au moins 50 % de la carte
// visible pendant une seconde continue. Le minuteur est annulé si la carte sort du viewport
// avant l'échéance — une carte seulement traversée rapidement ne compte pas.
const VISIBILITY_THRESHOLD = 0.5
const CONTINUOUS_VISIBLE_MS = 1000

export interface UseRecommendationImpressionInput {
  recommendationRequestId: string | undefined
  listingId: string
  position: number
  rankingVariant: string
  rankingVersion: string
}

export function useRecommendationImpression<T extends HTMLElement = HTMLDivElement>(
  input: UseRecommendationImpressionInput,
) {
  const elementRef = useRef<T | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)

  const { recommendationRequestId, listingId, position, rankingVariant, rankingVersion } = input

  useEffect(() => {
    firedRef.current = false
  }, [recommendationRequestId, listingId])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !recommendationRequestId || firedRef.current) return
    if (typeof IntersectionObserver === 'undefined') return

    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        const isVisibleEnough = entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD

        if (!isVisibleEnough) {
          clearTimer()
          return
        }

        if (timerRef.current !== null) return

        timerRef.current = setTimeout(() => {
          timerRef.current = null
          if (firedRef.current) return
          firedRef.current = true

          trackRecommendationEvent({
            eventName: 'recommendation_impression',
            recommendationRequestId,
            listingId,
            position,
            rankingVariant,
            rankingVersion,
          })

          observer.disconnect()
        }, CONTINUOUS_VISIBLE_MS)
      },
      { threshold: VISIBILITY_THRESHOLD },
    )

    observer.observe(element)

    return () => {
      clearTimer()
      observer.disconnect()
    }
  }, [recommendationRequestId, listingId, position, rankingVariant, rankingVersion])

  return elementRef
}
