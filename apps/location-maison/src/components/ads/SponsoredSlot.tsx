'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import InlineAdUnit from '@/components/ads/InlineAdUnit'
import type { AdCreativePublic, AdPlacement } from '@/models/advertising'

type SponsoredSlotProps = Readonly<{
  placement: AdPlacement
  /** Ciblage géo optionnel (page search/immobilier). */
  province?: string | null
  city?: string | null
  className?: string
  surface?: 'none' | 'card'
  /** Slot AdSense utilisé en fallback si aucune pub maison. */
  fallbackSlot: string
  fallbackSlotKey: string
  fallbackCompact?: boolean
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

  const containerClassName =
    surface === 'card'
      ? 'rounded-xl border border-gray-200 bg-white p-3 shadow-sm'
      : ''

  return (
    <div className={cn(containerClassName, className)}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Sponsorisé
      </p>
      <a
        href={creative.ctaUrl || '#'}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => track('click', creative.campaignId)}
        className="block overflow-hidden rounded-lg"
      >
        {creative.imageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creative.imageURL}
            alt={creative.headline || 'Publicité'}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        ) : null}
        {(creative.headline || creative.body || creative.ctaLabel) && (
          <div className="p-3">
            {creative.headline && (
              <p className="font-semibold text-[#224D62] dark:text-white">{creative.headline}</p>
            )}
            {creative.body && <p className="text-sm text-gray-600 dark:text-gray-300">{creative.body}</p>}
            {creative.ctaLabel && (
              <span className="mt-2 inline-block rounded-full bg-[#1FA89B] px-4 py-1.5 text-sm font-medium text-white">
                {creative.ctaLabel}
              </span>
            )}
          </div>
        )}
      </a>
    </div>
  )
}
