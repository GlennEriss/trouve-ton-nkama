/**
 * Forfaits publicitaires self-serve (payés en crédits).
 * Voir documentation/feature/publicite/README.md
 */

import type { AdPlacement } from '@/models/advertising'

export interface AdPackage {
  id: string
  name: string
  /** Coût en crédits. */
  credits: number
  /** Durée de diffusion en jours. */
  durationDays: number
  placements: AdPlacement[]
  description: string
  highlight?: boolean
}

export const AD_PACKAGES: ReadonlyArray<AdPackage> = [
  {
    id: 'discovery',
    name: 'Découverte',
    credits: 15,
    durationDays: 7,
    placements: ['search_infeed'],
    description: '7 jours sur la page de recherche.',
  },
  {
    id: 'visibility',
    name: 'Visibilité',
    credits: 35,
    durationDays: 14,
    placements: ['search_infeed', 'property_detail'],
    description: '14 jours sur la recherche et les pages détail.',
    highlight: true,
  },
  {
    id: 'brand',
    name: 'Marque',
    credits: 70,
    durationDays: 30,
    placements: ['search_infeed', 'property_detail', 'home', 'immobilier_infeed'],
    description: '30 jours sur tous les emplacements.',
  },
]

export function getAdPackage(id: string): AdPackage | undefined {
  return AD_PACKAGES.find((p) => p.id === id)
}
