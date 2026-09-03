'use client'

/**
 * Diapositive publicitaire plein écran intercalée dans le fil réels.
 * Deux variantes, alternées par le feed : `adsense` (Google AdSense) et
 * `house` (pub maison du module publicité, emplacement `reels_infeed`).
 * Si aucune campagne maison n'est active, la variante `house` retombe sur
 * AdSense — jamais de diapositive vide.
 */

import React from 'react'
import Link from 'next/link'
import { Loader2, Megaphone, Search } from 'lucide-react'
import AdSenseBlock from '@/components/ads/AdSenseBlock'
import AdCreativeCard from '@/components/ads/AdCreativeCard'
import { routes } from '@/constantes/routes'
import { ADSENSE_SLOTS } from '@/lib/ads/config'
import type { AdCreativePublic } from '@/models/advertising'
import { trackAdEvent } from '@/lib/statistics/ad-tracking.client'

export type ReelAdVariant = 'adsense' | 'house'

function AdSenseSlide({ slotKey }: { slotKey: string }) {
  const [status, setStatus] = React.useState<'loading' | 'filled' | 'fallback'>('loading')

  React.useEffect(() => {
    setStatus('loading')
    const timeoutId = window.setTimeout(() => {
      setStatus((current) => (current === 'filled' ? current : 'fallback'))
    }, 6500)

    return () => window.clearTimeout(timeoutId)
  }, [slotKey])

  const handleStatusChange = React.useCallback((adStatus: string | null) => {
    if (adStatus === 'filled') {
      setStatus('filled')
      return
    }

    if (adStatus === 'unfilled') {
      setStatus('fallback')
    }
  }, [])

  return (
    <>
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 text-white/70">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
          <p className="text-xs font-medium uppercase tracking-wide">Chargement</p>
        </div>
      )}

      {status === 'fallback' && <ReelsAdFallback />}

      {/* Format rectangle FIXE (pas "auto"/responsive) : le mode responsive
          d'AdSense injecte height:auto !important sur tous les ancêtres du
          bloc, ce qui écrase la chaîne h-full du carousel vertical et fige le
          défilement. Le garde-fou MutationObserver de ReelsFeedClient couvre
          le cas où AdSense le ferait quand même. */}
      <div
        className={
          status === 'filled'
            ? 'w-[85%] max-w-sm rounded-2xl bg-white p-4 shadow-2xl'
            : 'pointer-events-none absolute left-1/2 top-1/2 w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2 opacity-0'
        }
      >
        <AdSenseBlock
          slot={ADSENSE_SLOTS.reelsInline}
          slotKey={slotKey}
          format="rectangle"
          fullWidthResponsive={false}
          minHeight={250}
          onStatusChange={handleStatusChange}
        />
      </div>
    </>
  )
}

// Deux contenus alternés (choisis une fois par apparition, pas de logique de
// rotation touchée dans ReelsFeedClient.tsx) : promo pub maison classique, et
// promo des demandes de recherche — vise les annonceurs non-inscrits qui
// scrollent les réels, un des points d'entrée décidés pour cette section.
function ReelsAdFallback() {
  const [variant] = React.useState<'advertise' | 'search_requests'>(() =>
    Math.random() < 0.5 ? 'advertise' : 'search_requests',
  )

  if (variant === 'search_requests') {
    return (
      <div className="w-[85%] max-w-sm rounded-2xl border border-white/10 bg-neutral-900/80 p-5 text-center text-white shadow-2xl backdrop-blur-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-200">
          <Search className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-200">
          Demandes de recherche
        </p>
        <h2 className="mt-2 text-xl font-bold leading-tight">Des visiteurs cherchent un logement</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Consultez ce qu&apos;ils recherchent exactement et contactez-les directement sur
          WhatsApp si vous avez le bien qu&apos;il leur faut.
        </p>
        <Link
          href={routes.public.search_requests}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Voir les demandes
        </Link>
      </div>
    )
  }

  return (
    <div className="w-[85%] max-w-sm rounded-2xl border border-white/10 bg-neutral-900/80 p-5 text-center text-white shadow-2xl backdrop-blur-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">
        <Megaphone className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-200">
        Sponsorisé
      </p>
      <h2 className="mt-2 text-xl font-bold leading-tight">Votre bien peut être vu ici</h2>
      <p className="mt-3 text-sm leading-6 text-white/70">
        Mettez votre logement, terrain ou service immobilier devant les personnes qui
        regardent les réels.
      </p>
      <Link
        href={routes.public.publicite}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Faire de la pub
      </Link>
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
      trackAdEvent('impression', creative.campaignId, `reels:${slotKey}`)
    }
  }, [isActive, creative, slotKey])

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
        <AdCreativeCard
          creative={creative}
          placement="reels_infeed"
          reelFullscreen
          onClick={() => trackAdEvent('click', creative.campaignId, `reels:${slotKey}`)}
        />
      )}

      {loaded && !showHouse && <AdSenseSlide slotKey={slotKey} />}
    </div>
  )
}
