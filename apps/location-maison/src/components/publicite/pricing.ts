/**
 * Calcule les forfaits publicitaires affichables en FCFA pour la landing /publicite, à partir
 * de la MÊME source que le tunnel de création (`AD_PACKAGES`, en crédits) — voir
 * docs/location-maison/feature/publicite/LANDING-PUBLICITE.md §3.7 : « Les montants ne doivent
 * pas être recopiés en dur à plusieurs endroits. » `estimateCreditsXafValue` (déjà utilisé pour
 * la page recharge) convertit au meilleur taux crédit/FCFA disponible dans les packs actifs.
 */

import { AD_PACKAGES, type AdPackage } from '@/constantes/ad-packages'
import type { AdPlacement } from '@/models/advertising'
import {
  ADMIN_PACKS_TEMPLATE,
  estimateCreditsXafValue,
  formatXaf,
  type CreditPackData,
} from '@/lib/credits/credit-packs'

export const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  search_infeed: 'Résultats de recherche',
  property_detail: "Page d'annonce",
  home: "Page d'accueil",
  immobilier_infeed: 'Pages immobilier',
  reels_infeed: 'Fil des Réels',
}

export interface PublicAdPlan {
  id: string
  name: string
  durationDays: number
  placements: AdPlacement[]
  placementsLabel: string
  description: string
  priceXaf: number
  priceLabel: string
  highlight?: boolean
}

function buildPlan(pkg: AdPackage, packs: ReadonlyArray<CreditPackData>): PublicAdPlan {
  const priceXaf = estimateCreditsXafValue(pkg.credits, packs)
  return {
    id: pkg.id,
    name: pkg.name,
    durationDays: pkg.durationDays,
    placements: pkg.placements,
    placementsLabel: pkg.placements.map((p) => PLACEMENT_LABELS[p]).join(' + '),
    description: pkg.description,
    priceXaf,
    priceLabel: formatXaf(priceXaf),
    highlight: pkg.highlight,
  }
}

/**
 * `packs` = les packs de crédits actifs réellement configurés côté admin (lus en base par la
 * page serveur) ; en repli, `ADMIN_PACKS_TEMPLATE` — le même repli que `estimateCreditsXafValue`
 * utilise déjà ailleurs dans l'app quand aucun pack actif n'est trouvé.
 */
export function buildPublicAdPlans(
  packs: ReadonlyArray<CreditPackData> = ADMIN_PACKS_TEMPLATE,
): PublicAdPlan[] {
  const effectivePacks = packs.length > 0 ? packs : ADMIN_PACKS_TEMPLATE
  return AD_PACKAGES.map((pkg) => buildPlan(pkg, effectivePacks))
}

/** Prix du forfait d'entrée (le premier de la liste, "Découverte") — pour le hero et le H1. */
export function getEntryPriceLabel(plans: ReadonlyArray<PublicAdPlan>): string {
  return plans[0]?.priceLabel ?? formatXaf(estimateCreditsXafValue(AD_PACKAGES[0].credits))
}
