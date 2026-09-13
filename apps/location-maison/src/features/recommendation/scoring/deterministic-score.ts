/**
 * @module recommendation/scoring/deterministic-score
 */
import { ScoreComponentBreakdown, ScoreConfig, ScoreResult, ScoringCandidate, ScoringContext } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function scoreRelevance(candidate: ScoringCandidate, context: ScoringContext): number {
  if (!context.categoryLvl0 || !candidate.categoryLvl0) return 0.5
  return candidate.categoryLvl0 === context.categoryLvl0 ? 1 : 0
}

function scoreBudgetProximity(candidate: ScoringCandidate, context: ScoringContext): number {
  if (typeof candidate.price !== 'number') return 0.5
  const { budgetMin, budgetMax } = context
  if (typeof budgetMin !== 'number' && typeof budgetMax !== 'number') return 0.5

  const min = budgetMin ?? 0
  const max = budgetMax ?? Math.max(candidate.price, min + 1)
  if (max <= min) return 0.5

  const mid = (min + max) / 2
  const halfRange = (max - min) / 2
  const distance = Math.abs(candidate.price - mid)
  return clamp01(1 - distance / halfRange)
}

function scoreGeoMatch(candidate: ScoringCandidate, context: ScoringContext): number {
  let matches = 0
  let checks = 0

  if (context.city) {
    checks += 1
    if (candidate.city === context.city) matches += 1
  }
  if (context.province) {
    checks += 1
    if (candidate.province === context.province) matches += 1
  }

  if (checks === 0) return 0.5
  return matches / checks
}

function scoreRecency(candidate: ScoringCandidate, now: number, config: ScoreConfig): number {
  if (typeof candidate.createdAtMs !== 'number') return 0
  const ageDays = Math.max(0, (now - candidate.createdAtMs) / DAY_MS)
  const halfLife = config.recencyHalfLifeDays || 1
  return clamp01(Math.pow(0.5, ageDays / halfLife))
}

function scoreQuality(candidate: ScoringCandidate): number {
  return clamp01(candidate.imageCount / 5)
}

function scoreEngagement(candidate: ScoringCandidate, config: ScoreConfig): number {
  const engagement = candidate.engagement
  if (!engagement || engagement.impressions < config.minImpressionsForEngagement) return 0.5
  return clamp01(engagement.interactions / engagement.impressions)
}

function scoreExploration(candidate: ScoringCandidate, now: number, config: ScoreConfig): number {
  if (typeof candidate.createdAtMs !== 'number') return 0
  const ageDays = (now - candidate.createdAtMs) / DAY_MS
  if (ageDays < 0) return 0
  return ageDays <= config.newListingMaxAgeDays ? 1 : 0
}

// Fonction pure : aucune I/O, `now` toujours injecté (jamais Date.now() en interne) pour rester
// reproductible en test et pour permettre de rejouer un score passé à l'identique.
export function computeDeterministicScore(
  candidate: ScoringCandidate,
  context: ScoringContext,
  config: ScoreConfig,
  now: number,
): ScoreResult {
  const breakdown: ScoreComponentBreakdown = {
    relevance: clamp01(scoreRelevance(candidate, context)),
    budgetProximity: clamp01(scoreBudgetProximity(candidate, context)),
    geoMatch: clamp01(scoreGeoMatch(candidate, context)),
    recency: clamp01(scoreRecency(candidate, now, config)),
    quality: clamp01(scoreQuality(candidate)),
    engagement: clamp01(scoreEngagement(candidate, config)),
    exploration: clamp01(scoreExploration(candidate, now, config)),
  }

  const weights = config.weights
  const totalWeight =
    weights.relevance +
    weights.budgetProximity +
    weights.geoMatch +
    weights.recency +
    weights.quality +
    weights.engagement +
    weights.exploration

  const weightedSum =
    breakdown.relevance * weights.relevance +
    breakdown.budgetProximity * weights.budgetProximity +
    breakdown.geoMatch * weights.geoMatch +
    breakdown.recency * weights.recency +
    breakdown.quality * weights.quality +
    breakdown.engagement * weights.engagement +
    breakdown.exploration * weights.exploration

  const score = clamp01(totalWeight > 0 ? weightedSum / totalWeight : 0)

  return {
    listingId: candidate.listingId,
    score,
    breakdown,
    configVersion: config.version,
  }
}
