'use client'

import React, { useMemo, useState } from 'react'
import { Smartphone, Monitor, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import AdCreativeCard, { type AdCreativeCardData } from '@/components/ads/AdCreativeCard'
import type { AdPlacement } from '@/models/advertising'

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  home: 'Accueil',
  search_infeed: 'Recherche',
  property_detail: 'Détail annonce',
  immobilier_infeed: 'Immobilier',
  reels_infeed: 'Réels',
}

const skeleton = 'rounded bg-gray-200 dark:bg-gray-700'

/** Fausse carte d'annonce immobilière (contexte autour de la pub). */
function GhostCard() {
  return (
    <div className="space-y-1.5">
      <div className={cn('aspect-[4/3] w-full', skeleton)} />
      <div className={cn('h-2 w-3/4', skeleton)} />
      <div className={cn('h-2 w-1/2', skeleton)} />
    </div>
  )
}

function GhostGrid({ cols }: { cols: number }) {
  return (
    <div className={cn('grid gap-2', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {Array.from({ length: cols }).map((_, i) => (
        <GhostCard key={i} />
      ))}
    </div>
  )
}

/** Habille la pub du décor de la page réelle où elle s'affichera. */
function PreviewContext({
  placement,
  device,
  children,
}: {
  placement: AdPlacement
  device: 'mobile' | 'desktop'
  children: React.ReactNode
}) {
  const cols = device === 'desktop' ? 3 : 2

  if (placement === 'search_infeed' || placement === 'immobilier_infeed') {
    return (
      <div className="space-y-3">
        <GhostGrid cols={cols} />
        {children}
        <GhostGrid cols={cols} />
      </div>
    )
  }

  if (placement === 'property_detail') {
    return (
      <div className="space-y-3">
        <div className={cn('aspect-[16/9] w-full', skeleton)} />
        <div className={cn('h-3 w-2/3', skeleton)} />
        <div className={cn('h-2 w-1/2', skeleton)} />
        {children}
        <div className={cn('h-2 w-1/3', skeleton)} />
        <GhostGrid cols={2} />
      </div>
    )
  }

  if (placement === 'reels_infeed') {
    // Réplique le décor réel du fil réels (ReelAdSlide.tsx) : fond noir plein
    // cadre + pastille "Publicité" — pas le décor "accueil".
    return (
      <div className="relative flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
        <p className="absolute left-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur-sm">
          Publicité
        </p>
        {children}
      </div>
    )
  }

  // home
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={cn('h-6 w-6 rounded-full', skeleton)} />
        <div className="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-700">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <div className={cn('h-2 w-1/3', skeleton)} />
        </div>
      </div>
      {children}
      <GhostGrid cols={2} />
    </div>
  )
}

type AdCreativePreviewProps = Readonly<{
  creative: AdCreativeCardData
  /** Visuels adaptés par emplacement (override du visuel par défaut). */
  assets?: Partial<Record<AdPlacement, { imageURL?: string; videoURL?: string }>>
  /** Emplacements à prévisualiser (typiquement ceux du forfait/campagne). */
  placements: AdPlacement[]
  className?: string
}>

/**
 * Aperçu fidèle de la publicité, replacée dans le décor de la page réelle où
 * elle s'affichera (cartes d'annonces fantômes pour la recherche, chrome
 * accueil, bloc détail + recommandations). L'annonceur bascule entre
 * emplacements et entre mobile / desktop. Aucune navigation ni tracking.
 */
export default function AdCreativePreview({
  creative,
  assets,
  placements,
  className,
}: AdCreativePreviewProps) {
  const available = useMemo(
    () => (placements.length > 0 ? placements : (['home'] as AdPlacement[])),
    [placements],
  )
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [selected, setSelected] = useState<AdPlacement | null>(null)
  // Emplacement actif dérivé : la sélection si encore valide (forfait), sinon le 1er.
  const active = selected && available.includes(selected) ? selected : available[0]

  // Visuel adapté à l'emplacement affiché, sinon le visuel par défaut.
  const shownCreative: AdCreativeCardData = {
    ...creative,
    imageURL: assets?.[active]?.imageURL || creative.imageURL,
    videoURL: assets?.[active]?.videoURL || creative.videoURL,
  }

  const surface =
    active === 'search_infeed' || active === 'immobilier_infeed' ? 'card' : 'none'

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {available.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelected(p)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition',
                active === p
                  ? 'border-[#1FA89B] bg-[#1FA89B]/10 text-[#1FA89B]'
                  : 'border-gray-200 text-gray-500 hover:border-[#1FA89B]/40 dark:border-gray-600',
              )}
            >
              {PLACEMENT_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white p-1 dark:bg-gray-900">
          <button
            type="button"
            aria-label="Aperçu mobile"
            onClick={() => setDevice('mobile')}
            className={cn('rounded-full p-1.5', device === 'mobile' ? 'bg-[#1FA89B]/10 text-[#1FA89B]' : 'text-gray-400')}
          >
            <Smartphone className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Aperçu desktop"
            onClick={() => setDevice('desktop')}
            className={cn('rounded-full p-1.5', device === 'desktop' ? 'bg-[#1FA89B]/10 text-[#1FA89B]' : 'text-gray-400')}
          >
            <Monitor className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className={cn(
            'w-full rounded-xl bg-white p-3 shadow-sm transition-all dark:bg-gray-900',
            device === 'mobile' ? 'max-w-[360px]' : 'max-w-[680px]',
          )}
        >
          <PreviewContext placement={active} device={device}>
            {/* La vraie pub, mise en valeur dans le flux fantôme. */}
            <div className={cn(
              'rounded-lg ring-2 ring-[#1FA89B]/40',
              active === 'reels_infeed' && 'h-full w-full overflow-hidden rounded-xl',
            )}>
              {active === 'home' ? (
                // Hero accueil : bannière large sur dégradé, visuel entier (contain).
                <div className="aspect-[3/1] w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9]">
                  <AdCreativeCard
                    creative={shownCreative}
                    placement="home"
                    surface="none"
                    fillHeight
                    interactive={false}
                    className="h-full w-full [&_a]:h-full"
                  />
                </div>
              ) : active === 'reels_infeed' ? (
                // Plein slide, comme le rendu réel ReelAdSlide.tsx.
                <AdCreativeCard
                  creative={shownCreative}
                  placement="reels_infeed"
                  reelFullscreen
                  interactive={false}
                />
              ) : (
                <AdCreativeCard
                  creative={shownCreative}
                  placement={active}
                  surface={surface}
                  interactive={false}
                />
              )}
            </div>
          </PreviewContext>
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-gray-400">
        Aperçu indicatif — les blocs gris simulent le contenu de la page ; le rendu réel s&apos;adapte à chaque écran.
      </p>
    </div>
  )
}
