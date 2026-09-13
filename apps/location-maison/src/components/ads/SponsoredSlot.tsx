'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import InlineAdUnit from '@/components/ads/InlineAdUnit'
import AdCreativeCard from '@/components/ads/AdCreativeCard'
import type { AdCreativePublic, AdPlacement } from '@/models/advertising'
import { trackAdEvent } from '@/lib/statistics/ad-tracking.client'
import { resolveAdStackingDecision } from '@/lib/ads/stacking-experiment'

type SponsoredSlotProps = Readonly<{
  placement: AdPlacement
  /** Ciblage géo optionnel (page search/immobilier). */
  province?: string | null
  city?: string | null
  className?: string
  surface?: 'none' | 'card'
  /** Slot AdSense indépendant affiché même quand une pub maison existe. */
  fallbackSlot: string
  fallbackSlotKey: string
  fallbackCompact?: boolean
  /** Position dans le feed (search/immobilier) ; pilote la variante B_ALTERNATE. */
  rotationIndex?: number
  /** Le visuel remplit toute la hauteur du conteneur (hero accueil). */
  fillHeight?: boolean
}>

/**
 * Affiche l'inventaire pub maison et/ou l'unité AdSense selon la variante d'expérimentation
 * active (NEXT_PUBLIC_ADS_STACKING_EXPERIMENT_VARIANT, cf. lib/ads/stacking-experiment.ts).
 * Sans configuration, le comportement reste l'empilement historique : campagne maison si
 * active, puis toujours l'unité AdSense associée.
 */
export default function SponsoredSlot({
  placement,
  province,
  city,
  className,
  surface = 'none',
  fallbackSlot,
  fallbackSlotKey,
  fallbackCompact = false,
  rotationIndex,
  fillHeight = false,
}: SponsoredSlotProps) {
  const [creative, setCreative] = useState<AdCreativePublic | null>(null)
  const [loaded, setLoaded] = useState(false)
  const impressionSent = useRef(false)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ placement })
    if (province) params.set('province', province)
    if (city) params.set('city', city)

    fetch(`/api/advertising/active?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        setCreative(data?.creative ?? null)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [placement, province, city])

  const { showHouse, showAdSense } = resolveAdStackingDecision({
    placement,
    hasHouseCreative: Boolean(creative),
    rotationIndex,
  })

  // Impression trackée une seule fois quand une pub maison s'affiche.
  useEffect(() => {
    if (creative && showHouse && !impressionSent.current) {
      impressionSent.current = true
      trackAdEvent('impression', creative.campaignId, placement)
    }
  }, [creative, placement, showHouse])

  return (
    <div className={cn('space-y-3', className)}>
      {loaded && creative && showHouse ? (
        <AdCreativeCard
          creative={creative}
          placement={placement}
          surface={surface}
          fillHeight={fillHeight}
          interactive
          onClick={() => trackAdEvent('click', creative.campaignId, placement)}
        />
      ) : null}
      {showAdSense ? (
        <InlineAdUnit
          slot={fallbackSlot}
          slotKey={fallbackSlotKey}
          surface={surface}
          compact={fallbackCompact}
          showLabel
        />
      ) : null}
    </div>
  )
}
