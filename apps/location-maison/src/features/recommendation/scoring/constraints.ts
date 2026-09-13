/**
 * @module recommendation/scoring/constraints
 */
import { ScoringCandidate, ScoringContext } from './types'

// Règles de la doc (AVANT-IMPLEMENTATION.md §11) : jamais contournables par un score, quel
// qu'il soit. Un candidat qui échoue ici est retiré avant même de calculer un score.
export function passesHardConstraints(candidate: ScoringCandidate, context: ScoringContext): boolean {
  if (candidate.state !== 'IN_PROGRESS') return false
  if (candidate.moderationStatus !== 'APPROVED') return false
  if (context.excludedListingIds?.includes(candidate.listingId)) return false

  if (context.categoryLvl0 && candidate.categoryLvl0 && context.categoryLvl0 !== candidate.categoryLvl0) {
    return false
  }

  if (context.city && candidate.city && context.city !== candidate.city) {
    return false
  }

  if (typeof context.budgetMax === 'number' && typeof candidate.price === 'number' && candidate.price > context.budgetMax) {
    return false
  }

  if (typeof context.budgetMin === 'number' && typeof candidate.price === 'number' && candidate.price < context.budgetMin) {
    return false
  }

  return true
}

export function filterEligibleCandidates(
  candidates: ScoringCandidate[],
  context: ScoringContext,
): ScoringCandidate[] {
  return candidates.filter((candidate) => passesHardConstraints(candidate, context))
}
