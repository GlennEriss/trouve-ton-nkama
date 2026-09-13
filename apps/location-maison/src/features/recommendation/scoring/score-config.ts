/**
 * @module recommendation/scoring/score-config
 */
import { ScoreConfig } from './types'

// Version figée : voir docs/recommendation-ml/AVANT-IMPLEMENTATION.md §10. Toute évolution des
// poids ou des fenêtres crée une nouvelle version plutôt que de modifier celle-ci, pour ne jamais
// réinterpréter silencieusement un score déjà journalisé.
export const BASELINE_SCORE_CONFIG_V1: ScoreConfig = {
  version: 'baseline-v1',
  weights: {
    relevance: 0.3,
    budgetProximity: 0.2,
    geoMatch: 0.15,
    recency: 0.1,
    quality: 0.1,
    engagement: 0.1,
    exploration: 0.05,
  },
  recencyHalfLifeDays: 21,
  newListingMaxAgeDays: 7,
  minImpressionsForEngagement: 20,
}
