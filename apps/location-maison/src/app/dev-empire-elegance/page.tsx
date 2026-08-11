'use client'

import React, { useState } from 'react'
import AdCreativePreview from '@/components/ads/AdCreativePreview'
import type { AdCreativeCardData } from '@/components/ads/AdCreativeCard'
import type { AdPlacement } from '@/models/advertising'

/**
 * Page de preview DEV UNIQUEMENT — pas liée à Firestore/au wizard admin.
 * Sert à valider avec le client (Empire Élégance by S&S) le rendu des créas
 * avant de les publier via le module Publicité. À supprimer une fois validé.
 */

const TIKTOK_URL = 'https://www.tiktok.com/@empire.elegance.b?_r=1&_t=ZN-98n3oa9msB4'

const BASE_CREATIVE: Omit<AdCreativeCardData, 'imageURL'> = {
  headline: 'Shoppez les vêtements de vos rêves sans vous ruiner ✨',
  body: 'Friperie & boutique à petits prix 🤍\nEmpire Élégance by SS — l\'élégance à votre portée.',
  ctaLabel: 'Voir sur TikTok',
  ctaUrl: TIKTOK_URL,
}

const PLACEMENTS: AdPlacement[] = [
  'home',
  'search_infeed',
  'immobilier_infeed',
  'property_detail',
  'reels_infeed',
]

const VARIANTS = {
  red: {
    label: 'Modèle 1 — Ensemble rouge',
    swatch: '#7a1f2b',
    assets: {
      home: { imageURL: '/dev-empire-elegance/generated/hero-red.jpg' },
      search_infeed: { imageURL: '/dev-empire-elegance/generated/infeed-red.jpg' },
      immobilier_infeed: { imageURL: '/dev-empire-elegance/generated/infeed-red.jpg' },
      property_detail: { imageURL: '/dev-empire-elegance/generated/detail-red.jpg' },
      reels_infeed: { imageURL: '/dev-empire-elegance/generated/reels-red.jpg' },
    },
  },
  olive: {
    label: 'Modèle 2 — Ensemble kaki',
    swatch: '#6b7452',
    assets: {
      home: { imageURL: '/dev-empire-elegance/generated/hero-olive.jpg' },
      search_infeed: { imageURL: '/dev-empire-elegance/generated/infeed-olive.jpg' },
      immobilier_infeed: { imageURL: '/dev-empire-elegance/generated/infeed-olive.jpg' },
      property_detail: { imageURL: '/dev-empire-elegance/generated/detail-olive.jpg' },
      reels_infeed: { imageURL: '/dev-empire-elegance/generated/reels-olive.jpg' },
    },
  },
} as const satisfies Record<string, { label: string; swatch: string; assets: Partial<Record<AdPlacement, { imageURL?: string }>> }>

export default function DevEmpireEleganceAdPreview() {
  const [variant, setVariant] = useState<keyof typeof VARIANTS>('red')
  const current = VARIANTS[variant]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
        Preview dev — module Publicité
      </p>
      <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white">
        Empire Élégance by S&amp;S
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Aperçu des créas avant publication (3 mois, tous emplacements). Deux visuels
        au choix — bascule pour comparer, puis choisis l&apos;emplacement et
        mobile/desktop ci-dessous.
      </p>

      <div className="mt-6 flex gap-2">
        {(Object.keys(VARIANTS) as Array<keyof typeof VARIANTS>).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setVariant(key)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              variant === key
                ? 'border-secondary bg-secondary/10 text-secondary'
                : 'border-gray-200 text-gray-500 hover:border-secondary/40 dark:border-gray-600'
            }`}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: VARIANTS[key].swatch }}
            />
            {VARIANTS[key].label}
          </button>
        ))}
      </div>

      <AdCreativePreview
        className="mt-6"
        creative={{ ...BASE_CREATIVE, imageURL: current.assets.home?.imageURL }}
        assets={current.assets}
        placements={PLACEMENTS}
      />

      <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
        <p className="font-semibold text-ink dark:text-white">Note</p>
        <p className="mt-1">
          Sur l&apos;accueil (bannière hero), le texte est incrusté dans le visuel
          (le composant n&apos;affiche pas de texte séparé pour ce format). Sur les
          autres emplacements, le texte ci-dessus s&apos;affiche sous/sur la photo,
          comme en production.
        </p>
      </div>
    </div>
  )
}
