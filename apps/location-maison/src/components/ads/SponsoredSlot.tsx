'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import InlineAdUnit from '@/components/ads/InlineAdUnit'
import AdCreativeCard from '@/components/ads/AdCreativeCard'
import type { AdCreativePublic, AdPlacement } from '@/models/advertising'

type SponsoredSlotProps = Readonly<{
  placement: AdPlacement
  /** Ciblage géo optionnel (page search/immobilier). */
  province?: string | null
  city?: string | null
  className?: string
  surface?: 'none' | 'card'
  /** Slot AdSense affiché en fallback, OU à son tour lors de la rotation. */
  fallbackSlot: string
  fallbackSlotKey: string
  fallbackCompact?: boolean
  /**
   * Rotation pub maison ↔ AdSense. Si fourni (feed multi-slots) : index pair →
   * on tente la pub maison, impair → AdSense. Si absent (emplacement unique) :
   * la pub maison est prioritaire et AdSense ne sert que de repli.
   */
  rotationIndex?: number
  /** Le visuel remplit toute la hauteur du conteneur (hero accueil). */
  fillHeight?: boolean
}>

function track(event: 'impression' | 'click', campaignId: string) {
  try {
    const body = JSON.stringify({ event, campaignId })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/advertising/track', new Blob([body], { type: 'application/json' }))
      return
    }
    fetch('/api/advertising/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* tracking best-effort */
  }
}

/**
 * Affiche en priorité une publicité maison (régie first-party) pour l'emplacement
 * donné ; à défaut, retombe sur l'unité AdSense existante. Voir
 * documentation/feature/publicite/README.md
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

  // Décide si CE slot tente la pub maison ou laisse sa place à AdSense.
  // - Feed (rotationIndex fourni) : on alterne maison/AdSense (swap).
  // - Slot unique (accueil, détail) : on privilégie la pub maison quand une
  //   campagne est active ; AdSense ne sert que de repli.
  const [preferHouse] = useState(() =>
    rotationIndex == null ? true : rotationIndex % 2 === 0,
  )

  useEffect(() => {
    // Tour d'AdSense : on n'appelle pas la régie maison, on rend le fallback.
    if (!preferHouse) {
      setCreative(null)
      setLoaded(true)
      return
    }

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
  }, [preferHouse, placement, province, city])

  // Impression trackée une seule fois quand une pub maison s'affiche.
  useEffect(() => {
    if (creative && !impressionSent.current) {
      impressionSent.current = true
      track('impression', creative.campaignId)
    }
  }, [creative])

  // Tant que la requête n'a pas répondu : ne rien afficher (évite le flash AdSense).
  if (!loaded) {
    return <div className={cn('min-h-[60px]', className)} aria-hidden />
  }

  // Aucune pub maison → fallback AdSense.
  if (!creative) {
    return (
      <InlineAdUnit
        slot={fallbackSlot}
        slotKey={fallbackSlotKey}
        className={className}
        surface={surface}
        compact={fallbackCompact}
        showLabel
      />
    )
  }

  return (
    <AdCreativeCard
      creative={creative}
      placement={placement}
      surface={surface}
      className={className}
      fillHeight={fillHeight}
      interactive
      onClick={() => track('click', creative.campaignId)}
    />
  )
}
