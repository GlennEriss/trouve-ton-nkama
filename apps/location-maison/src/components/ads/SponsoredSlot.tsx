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
  /** Slot AdSense indépendant affiché même quand une pub maison existe. */
  fallbackSlot: string
  fallbackSlotKey: string
  fallbackCompact?: boolean
  /** Conservé pour compatibilité des appels existants ; ne pilote plus AdSense. */
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
 * Affiche l'inventaire pub maison quand une campagne est active, puis affiche
 * toujours l'unité AdSense associée. Les deux inventaires sont indépendants.
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

  // Impression trackée une seule fois quand une pub maison s'affiche.
  useEffect(() => {
    if (creative && !impressionSent.current) {
      impressionSent.current = true
      track('impression', creative.campaignId)
    }
  }, [creative])

  return (
    <div className={cn('space-y-3', className)}>
      {loaded && creative ? (
        <AdCreativeCard
          creative={creative}
          placement={placement}
          surface={surface}
          fillHeight={fillHeight}
          interactive
          onClick={() => track('click', creative.campaignId)}
        />
      ) : null}
      <InlineAdUnit
        slot={fallbackSlot}
        slotKey={fallbackSlotKey}
        surface={surface}
        compact={fallbackCompact}
        showLabel
      />
    </div>
  )
}
