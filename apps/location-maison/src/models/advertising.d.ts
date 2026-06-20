/**
 * @module advertising
 *
 * Régie publicitaire first-party : pubs d'entreprises/marques externes,
 * distinctes des annonces immobilières (`announcer`) et d'AdSense.
 * Voir documentation/feature/publicite/README.md
 */

import { Timestamp } from 'firebase/firestore'

/** Emplacements publicitaires ouverts en V1. */
export type AdPlacement =
  | 'search_infeed'
  | 'property_detail'
  | 'home'
  | 'immobilier_infeed'

export type AdCampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'ended'
  | 'rejected'

/** Mode de facturation. V1 concierge = `admin_amount` (montant FCFA). */
export type AdBillingMode = 'admin_amount' | 'user_credits'
export type AdPaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface AdBilling {
  mode: AdBillingMode
  /** Montant payé en FCFA (mode `admin_amount`). */
  amount?: number
  currency?: 'XAF'
  /** Espèces / virement / Airtel direct / autre. */
  paymentMethod?: string
  paymentReference?: string
  paidAt?: Timestamp
  paymentStatus: AdPaymentStatus
  /** Uniquement en mode `user_credits` (self-serve, phase 2). */
  creditsUsed?: number
}

/** Un visuel hébergé (chemin Storage + URL publique). */
export interface AdAsset {
  imagePATH: string
  imageURL: string
}

/**
 * Visuels spécifiques par emplacement (optionnel). Si un emplacement n'a pas de
 * visuel dédié, on retombe sur `imageURL`/`imagePATH` (le visuel par défaut).
 * Plusieurs emplacements de même forme partagent souvent le même fichier.
 */
export type AdAssets = Partial<Record<AdPlacement, AdAsset>>

/** Visuel + appel à l'action de la pub. */
export interface AdCreative {
  /** Visuel par défaut (fallback si pas de visuel spécifique pour l'emplacement). */
  imagePATH: string
  imageURL: string
  /** Visuels adaptés par emplacement (optionnel). */
  assets?: AdAssets
  headline?: string
  body?: string
  /** Ex: "Appeler", "WhatsApp", "Voir". */
  ctaLabel?: string
  /** Lien externe / wa.me / tel: / URL. */
  ctaUrl?: string
}

/** Ciblage géographique optionnel (réutilise la géo Gabon). */
export interface AdTargeting {
  provinces?: string[]
  cities?: string[]
}

export interface AdMetrics {
  impressions: number
  clicks: number
}

/** L'entreprise qui paie la pub (≠ rôle `announcer` immobilier). */
export interface Advertiser {
  id: string
  name: string
  businessName?: string
  contactPhone?: string
  contactEmail?: string
  /** Rattaché à un compte user si self-serve (phase 2). */
  ownerUid?: string | null
  createdByAdminUid?: string
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface AdCampaign {
  id: string
  advertiserId: string
  title: string
  creative: AdCreative
  placements: AdPlacement[]
  targeting?: AdTargeting
  startDate: Timestamp
  endDate: Timestamp
  status: AdCampaignStatus
  /** Arbitrage si plusieurs campagnes éligibles sur un même emplacement. */
  priority: number
  billing: AdBilling
  /** V1 = toujours l'admin (concierge). */
  createdByAdminUid?: string
  metrics: AdMetrics
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Forme légère renvoyée au client pour le rendu (pas de données internes). */
export interface AdCreativePublic {
  campaignId: string
  placement: AdPlacement
  imageURL: string
  headline?: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
}
