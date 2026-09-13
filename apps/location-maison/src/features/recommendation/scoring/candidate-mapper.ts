import type { ScoringCandidate } from './types'

// Champs FIELDS= de extensions/firestore-algolia-search.env — tous déjà indexés, aucun ajout
// d'index nécessaire pour ce mapping (audit Phase 0/1, docs/recommendation-ml/).
export interface AlgoliaListingHit {
  objectID: string
  categoryPath?: { lvl0?: string; lvl1?: string }
  city?: string
  province?: string
  price?: number
  area?: number
  // Algolia (recherche) indexe createdAt en nombre ; les propriétés lues directement depuis
  // Firestore (carrousels accueil) portent un Timestamp `{seconds, nanoseconds}` — les deux
  // formes sont acceptées ici pour que ce mapper serve les deux sources sans adaptateur
  // supplémentaire par appelant.
  createdAt?: number | string | { seconds: number; nanoseconds?: number }
  state?: string
  moderationStatus?: string
  isPromoted?: boolean
  images?: unknown[]
  createdBy?: string
}

function toCreatedAtMs(createdAt: AlgoliaListingHit['createdAt']): number | undefined {
  if (typeof createdAt === 'number') return createdAt
  if (typeof createdAt === 'string') {
    const parsed = Date.parse(createdAt)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (createdAt && typeof createdAt === 'object' && typeof createdAt.seconds === 'number') {
    return createdAt.seconds * 1000 + Math.round((createdAt.nanoseconds ?? 0) / 1e6)
  }
  return undefined
}

export type RecommendationWireCandidate = ScoringCandidate & { position: number }

// Combine le mapping ci-dessous avec la position d'affichage — forme exacte attendue par
// /api/recommendations/requests (voir RecommendationScoringCandidate côté
// features/recommendation/tracking/recommendation-request.client.ts, structurellement
// identique). Utilisé par toutes les surfaces MVP (accueil, recherche) pour construire le
// payload envoyé au serveur.
export function toRecommendationCandidate(hit: AlgoliaListingHit, position: number): RecommendationWireCandidate {
  return { ...toScoringCandidate(hit), position }
}

// Une annonce sans categoryPath est une annonce immobilier antérieure au backfill
// multi-catégories (voir models/annonce.d.ts) — jamais une annonce Mode, qui a toujours
// categoryPath depuis son introduction. Repli légitime, pas une approximation risquée.
export function toScoringCandidate(hit: AlgoliaListingHit): ScoringCandidate {
  return {
    listingId: hit.objectID,
    // 'Immobilier' (capitale) : convention réelle de categoryPath.lvl0 dans tout le reste du
    // code (voir src/lib/listing-scope.ts) — un mismatch de casse ferait échouer à tort la
    // contrainte de catégorie pour toute annonce immobilier pré-backfill.
    categoryLvl0: hit.categoryPath?.lvl0 ?? 'Immobilier',
    city: hit.city,
    province: hit.province,
    price: hit.price,
    area: hit.area,
    createdAtMs: toCreatedAtMs(hit.createdAt),
    state: hit.state === 'ARCHIVED' ? 'ARCHIVED' : 'IN_PROGRESS',
    moderationStatus: hit.moderationStatus ?? 'PENDING',
    isPromoted: hit.isPromoted,
    imageCount: Array.isArray(hit.images) ? hit.images.length : 0,
    advertiserId: hit.createdBy,
  }
}
