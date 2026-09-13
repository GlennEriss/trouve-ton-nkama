/**
 * @module recommendation/scoring/diversity
 */
import { ScoreResult, ScoringCandidate } from './types'

export interface RankableCandidate {
  candidate: ScoringCandidate
  scoreResult: ScoreResult
}

// AVANT-IMPLEMENTATION.md §12 : pas plus de deux annonces consécutives du même annonceur.
const MAX_CONSECUTIVE_SAME_ADVERTISER = 2

// Tri stable : à score égal, départage par listingId (jamais par ordre d'arrivée, qui dépend de
// la source du batch de candidats et romprait la reproductibilité).
export function stableSort(ranked: RankableCandidate[]): RankableCandidate[] {
  return [...ranked].sort((a, b) => {
    if (b.scoreResult.score !== a.scoreResult.score) {
      return b.scoreResult.score - a.scoreResult.score
    }
    return a.candidate.listingId < b.candidate.listingId ? -1 : a.candidate.listingId > b.candidate.listingId ? 1 : 0
  })
}

export function applyAdvertiserDiversity(sorted: RankableCandidate[]): RankableCandidate[] {
  const result: RankableCandidate[] = []
  const pool = [...sorted]
  let consecutiveCount = 0
  let lastAdvertiserId: string | undefined

  while (pool.length > 0) {
    const nextIndex = pool.findIndex((item) => {
      const advertiserId = item.candidate.advertiserId
      if (!advertiserId) return true
      if (advertiserId !== lastAdvertiserId) return true
      return consecutiveCount < MAX_CONSECUTIVE_SAME_ADVERTISER
    })

    if (nextIndex === -1) {
      // Tout le reste violerait la contrainte (catalogue dominé par un seul annonceur) : on
      // les ajoute dans l'ordre du score plutôt que de perdre des candidats éligibles.
      result.push(...pool)
      break
    }

    const [next] = pool.splice(nextIndex, 1)
    const advertiserId = next.candidate.advertiserId
    if (advertiserId && advertiserId === lastAdvertiserId) {
      consecutiveCount += 1
    } else {
      consecutiveCount = advertiserId ? 1 : 0
      lastAdvertiserId = advertiserId
    }
    result.push(next)
  }

  return result
}

export function deduplicateByListingId(ranked: RankableCandidate[]): RankableCandidate[] {
  const seen = new Set<string>()
  const result: RankableCandidate[] = []
  for (const item of ranked) {
    if (seen.has(item.candidate.listingId)) continue
    seen.add(item.candidate.listingId)
    result.push(item)
  }
  return result
}
