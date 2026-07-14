'use client'

/**
 * Diapositive publicitaire plein écran intercalée dans le fil réels.
 * Deux variantes, alternées par le feed : `adsense` (Google AdSense) et
 * `house` (pub maison du module publicité, emplacement `reels_infeed`).
 * Si aucune campagne maison n'est active, la variante `house` retombe sur
 * AdSense — jamais de diapositive vide.
 */

import React from 'react'
import AdSenseBlock from '@/components/ads/AdSenseBlock'
import AdCreativeCard from '@/components/ads/AdCreativeCard'
import { ADSENSE_SLOTS } from '@/lib/ads/config'
import type { AdCreativePublic } from '@/models/advertising'

export type ReelAdVariant = 'adsense' | 'house'

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

function AdSenseSlide({ slotKey }: { slotKey: string }) {
  return (
    <div className="w-[85%] max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
      {/* Format rectangle FIXE (pas "auto"/responsive) : le mode responsive
          d'AdSense injecte height:auto !important sur tous les ancêtres du
          bloc, ce qui écrase la chaîne h-full du carousel vertical et fige le
          défilement. Le garde-fou MutationObserver de ReelsFeedClient couvre
          le cas où AdSense le ferait quand même. */}
      <AdSenseBlock
        slot={ADSENSE_SLOTS.reelsInline}
        slotKey={slotKey}
        format="rectangle"
        fullWidthResponsive={false}
        minHeight={250}
      />
    </div>
  )
}

export default function ReelAdSlide({
  variant,
  isActive,
  slotKey,
}: Readonly<{
  variant: ReelAdVariant
  isActive: boolean
  /** Clé unique par diapositive pour que chaque unité AdSense soit distincte. */
  slotKey: string
}>) {
  const [creative, setCreative] = React.useState<AdCreativePublic | null>(null)
  const [loaded, setLoaded] = React.useState(variant === 'adsense')
  const impressionSent = React.useRef(false)

  // Variante maison : charger la campagne active pour l'emplacement réels.
  React.useEffect(() => {
    if (variant !== 'house') return
    let cancelled = false
    fetch('/api/advertising/active?placement=reels_infeed')
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
  }, [variant])

  // Impression comptée à la première apparition à l'écran (pas au montage :
  // les diapositives voisines du carousel sont montées d'avance).
  React.useEffect(() => {
    if (isActive && creative && !impressionSent.current) {
      impressionSent.current = true
      track('impression', creative.campaignId)
    }
  }, [isActive, creative])

  const showHouse = variant === 'house' && creative !== null

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-950">
      <p className="absolute left-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur-sm">
        Publicité
      </p>

      {!loaded && (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      )}

      {loaded && showHouse && creative && (
        <div className="w-[85%] max-w-sm">
          <AdCreativeCard
            creative={creative}
            placement="reels_infeed"
            surface="card"
            onClick={() => track('click', creative.campaignId)}
          />
        </div>
      )}

      {loaded && !showHouse && <AdSenseSlide slotKey={slotKey} />}
    </div>
  )
}
