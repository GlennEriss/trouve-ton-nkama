/**
 * Regroupement des emplacements par FORME de visuel, pour les formulaires de
 * création de pub : l'annonceur fournit un visuel par format, appliqué à tous
 * les emplacements du groupe. Voir documentation/feature/publicite/README.md
 */

import type { AdPlacement } from '@/models/advertising'

export type AdFormatKey = 'hero' | 'infeed' | 'detail'

export interface AdFormat {
  key: AdFormatKey
  label: string
  /** Indication de ratio (texte court). */
  ratioHint: string
  /** Dimensions conseillées (px). */
  recommended: string
  placements: AdPlacement[]
}

export const AD_FORMATS: ReadonlyArray<AdFormat> = [
  { key: 'hero', label: 'Bannière accueil', ratioHint: 'paysage ~3:1', recommended: '1200×400', placements: ['home'] },
  {
    key: 'infeed',
    label: 'Bannière in-feed (recherche / immobilier)',
    ratioHint: 'large ~16:5',
    recommended: '1200×375',
    placements: ['search_infeed', 'immobilier_infeed'],
  },
  { key: 'detail', label: 'Bannière détail annonce', ratioHint: 'large ~4:1', recommended: '1200×300', placements: ['property_detail'] },
  { key: 'reels', label: 'Pub plein écran réels', ratioHint: 'portrait ~4:5', recommended: '1080×1350', placements: ['reels_infeed'] },
]

/** Formats pertinents pour un sous-ensemble d'emplacements (forfait). */
export function formatsForPlacements(placements: AdPlacement[]): AdFormat[] {
  return AD_FORMATS.filter((f) => f.placements.some((p) => placements.includes(p)))
}
