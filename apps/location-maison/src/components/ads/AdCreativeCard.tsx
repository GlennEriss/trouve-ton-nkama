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
 */
export const PLACEMENT_ASPECT: Record<AdPlacement, string> = {
  home: 'aspect-[16/9]',
  search_infeed: 'aspect-[4/3]',
  immobilier_infeed: 'aspect-[4/3]',
  property_detail: 'aspect-[3/1]',
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

  const imageClassName = fillHeight
    ? 'h-full w-full object-cover'
    : cn('w-full object-cover', PLACEMENT_ASPECT[placement])

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
            fillHeight ? 'h-full w-full' : cn('w-full', PLACEMENT_ASPECT[placement]),
          )}
        >
          Visuel de la publicité
        </div>
      )}
      {(creative.headline || creative.body || creative.ctaLabel) && (
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

  return (
    <div className={cn(containerClassName, className)}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Sponsorisé
      </p>
      {interactive ? (
        <a
          href={creative.ctaUrl || '#'}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={onClick}
          className="block overflow-hidden rounded-lg"
        >
          {inner}
        </a>
      ) : (
        <div className="block overflow-hidden rounded-lg">{inner}</div>
      )}
    </div>
  )
}
