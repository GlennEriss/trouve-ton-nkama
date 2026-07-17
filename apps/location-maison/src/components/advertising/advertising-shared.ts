import type { AdPlacement } from '@/models/advertising'

export type AdAssetDraft = {
  imageURL?: string
  imagePATH?: string
  videoURL?: string
  videoPATH?: string
}

export type AssetMap = Partial<Record<AdPlacement, AdAssetDraft>>

export type MyCampaign = {
  id: string
  title: string
  status: string
  placements: string[]
  imageURL: string
  videoURL?: string
  startDate: string | null
  endDate: string | null
  metrics: { impressions: number; clicks: number }
  creditsUsed: number
}

export const PACKAGE_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  home: 'Accueil',
  search_infeed: 'Recherche',
  property_detail: 'Détail',
  immobilier_infeed: 'Immobilier',
  reels_infeed: 'Réels',
}

export const STATUS_LABEL: Record<string, string> = {
  active: 'En ligne',
  scheduled: 'Programmée',
  pending_review: 'En validation',
  paused: 'En pause',
  ended: 'Terminée',
  rejected: 'Refusée',
  draft: 'Brouillon',
}

export function formatCampaignDate(value: string | null) {
  if (!value) return 'Date non définie'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function getStatusClassName(status: string) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'ended') return 'bg-gray-100 text-gray-600 ring-gray-200'
  if (status === 'rejected') return 'bg-red-50 text-red-700 ring-red-200'
  if (status === 'paused') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-blue-50 text-blue-700 ring-blue-200'
}

export function hasAsset(asset?: AdAssetDraft) {
  return Boolean(asset?.imageURL || asset?.videoURL)
}
