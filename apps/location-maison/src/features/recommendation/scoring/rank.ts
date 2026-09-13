/**
 * @module recommendation/scoring/rank
 */
import { filterEligibleCandidates } from './constraints'
import { computeDeterministicScore } from './deterministic-score'
import { applyAdvertiserDiversity, deduplicateByListingId, RankableCandidate, stableSort } from './diversity'
import { ScoreConfig, ScoringCandidate, ScoringContext } from './types'

export interface RankedListing {
  listingId: string
  score: number
  configVersion: string
}

// Orchestration pure : contraintes -> score -> tri stable -> diversité. Aucune I/O, pas encore
// branchée sur une page/API (Phase 0 reste hors production).
export function rankCandidates(
  candidates: ScoringCandidate[],
  context: ScoringContext,
  config: ScoreConfig,
  now: number,
): RankedListing[] {
  const eligible: RankableCandidate[] = filterEligibleCandidates(candidates, context).map((candidate) => ({
    candidate,
    scoreResult: computeDeterministicScore(candidate, context, config, now),
  }))

  const deduplicated = deduplicateByListingId(eligible)
  const sorted = stableSort(deduplicated)
  const diversified = applyAdvertiserDiversity(sorted)

  return diversified.map(({ candidate, scoreResult }) => ({
    listingId: candidate.listingId,
    score: scoreResult.score,
    configVersion: scoreResult.configVersion,
  }))
}
