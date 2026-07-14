'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { AdPlacement } from '@/models/advertising'

/** Données minimales nécessaires au rendu d'une créa (live ou preview). */
export type AdCreativeCardData = Readonly<{
  imageURL?: string
  headline?: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
}>

/**
 * Ratio d'image conseillé/réservé par emplacement. Sert à la fois à réserver la
 * place (anti-CLS) côté serving et à cadrer la preview côté formulaire.
 *
 * Ratios LARGES (bannière) : ils scalent avec la largeur du slot, donc le visuel
 * reste proportionné aussi bien en mobile qu'en desktop. On évite les ratios
 * hauts (type 4/3) qui exploseraient la hauteur sur les slots in-feed pleine
 * largeur. L'accueil desktop utilise `fillHeight` (hero) et ignore ce ratio.
 */
export const PLACEMENT_MEDIA: Record<AdPlacement, string> = {
  home: 'aspect-[16/6]',
  search_infeed: 'aspect-[16/5]',
  immobilier_infeed: 'aspect-[16/5]',
  property_detail: 'aspect-[16/4]',
  // Diapositive plein écran du fil réels : format portrait, seul emplacement
  // où le visuel occupe une carte verticale et non une bannière.
  reels_infeed: 'aspect-[4/5]',
}

type AdCreativeCardProps = Readonly<{
  creative: AdCreativeCardData
  placement: AdPlacement
  surface?: 'none' | 'card'
  className?: string
  /** Le hero accueil remplit toute la hauteur : on saute l'aspect-ratio. */
  fillHeight?: boolean
  /**
   * `false` (preview) : rendu non cliquable, pas de tracking. `true` (serving) :
   * lien réel + callback de tracking.
   */
  interactive?: boolean
  onClick?: () => void
}>

/**
 * Rendu présentationnel pur d'une publicité maison (label « Sponsorisé » +
 * visuel + textes + CTA). Partagé entre le serving (`SponsoredSlot`) et la
 * preview des formulaires de création. Ne fait aucun fetch.
 */
export default function AdCreativeCard({
  creative,
  placement,
  surface = 'none',
  className,
  fillHeight = false,
  interactive = true,
  onClick,
}: AdCreativeCardProps) {
  const containerClassName =
    surface === 'card'
      ? 'rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900'
      : ''

  // `object-contain` : le visuel entier reste visible (jamais de contenu rogné),
  // sur un fond neutre. Le hero (fillHeight) remplit la hauteur ; les autres
  // emplacements réservent un ratio fixe (anti-CLS).
  const imageClassName = fillHeight
    ? 'h-full w-full object-contain'
    : cn('w-full bg-gray-50 object-contain dark:bg-gray-800/40', PLACEMENT_MEDIA[placement])

  const inner = (
    <>
      {creative.imageURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creative.imageURL}
          alt={creative.headline || 'Publicité'}
          className={imageClassName}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center bg-gray-100 text-xs text-gray-400 dark:bg-gray-800',
            fillHeight ? 'h-full w-full' : cn('w-full', PLACEMENT_MEDIA[placement]),
          )}
        >
          Visuel de la publicité
        </div>
      )}
      {!fillHeight && (creative.headline || creative.body || creative.ctaLabel) && (
        <div className="p-3">
          {creative.headline && (
            <p className="font-semibold text-[#224D62] dark:text-white">{creative.headline}</p>
          )}
          {creative.body && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{creative.body}</p>
          )}
          {creative.ctaLabel && (
            <span className="mt-2 inline-block rounded-full bg-[#1FA89B] px-4 py-1.5 text-sm font-medium text-white">
              {creative.ctaLabel}
            </span>
          )}
        </div>
      )}
    </>
  )

  const linkClassName = cn('block overflow-hidden rounded-lg', fillHeight && 'h-full')

  return (
    <div className={cn('relative', fillHeight && 'h-full', containerClassName, className)}>
      <p
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wide text-gray-400',
          fillHeight ? 'absolute left-2 top-2 z-10' : 'mb-2',
        )}
      >
        Sponsorisé
      </p>
      {interactive ? (
        <a
          href={creative.ctaUrl || '#'}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={onClick}
          className={linkClassName}
        >
          {inner}
        </a>
      ) : (
        <div className={linkClassName}>{inner}</div>
      )}
    </div>
  )
}
