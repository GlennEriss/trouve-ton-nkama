import { getCacheStore } from '@/lib/cache'

// Alignée sur la fenêtre d'attribution la plus longue de la doc (favori/contact, 24h) —
// docs/recommendation-ml/AVANT-IMPLEMENTATION.md §4. Un event arrivant après ce délai est hors
// fenêtre et doit être rejeté, pas juste "non validable faute de cache".
const SERVED_CANDIDATES_TTL_SECONDS = 24 * 60 * 60
const EVENT_DEDUP_TTL_SECONDS = 24 * 60 * 60

const servedCandidatesKey = (recommendationRequestId: string) => `reco:req:${recommendationRequestId}`
const eventDedupKey = (eventId: string) => `reco:evt:${eventId}`

export async function storeServedCandidates(
  recommendationRequestId: string,
  listingIds: string[],
): Promise<void> {
  const store = getCacheStore()
  await store.set(servedCandidatesKey(recommendationRequestId), listingIds, SERVED_CANDIDATES_TTL_SECONDS)
}

// Best-effort par construction (CacheStore ne lève jamais) : si Redis est indisponible, on
// retombe sur "non servi" (false) plutôt que d'accepter un event non vérifiable — échec fermé,
// cohérent avec l'exigence de la doc de ne jamais laisser un event non corrélé entrer dans le
// dataset d'entraînement.
export async function wasListingServed(
  recommendationRequestId: string,
  listingId: string,
): Promise<boolean> {
  const store = getCacheStore()
  const listingIds = await store.get<string[]>(servedCandidatesKey(recommendationRequestId))
  if (!listingIds) return false
  return listingIds.includes(listingId)
}

// SETNX applicatif : true la première fois qu'un eventId est vu, false ensuite (rejeu).
export async function claimEventId(eventId: string): Promise<boolean> {
  const store = getCacheStore()
  return store.setIfAbsent(eventDedupKey(eventId), true, EVENT_DEDUP_TTL_SECONDS)
}
