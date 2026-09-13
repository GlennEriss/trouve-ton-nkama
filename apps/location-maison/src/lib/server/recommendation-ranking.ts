import { createHash } from 'node:crypto'

export type RankingVariant = 'control' | 'baseline'

// Trafic exposé au score pondéré (variante "baseline") — voir
// docs/recommendation-ml/AVANT-IMPLEMENTATION.md §13 (80% contrôle / 20% baseline recommandé).
// Kill switch soft : mettre RECOMMENDATION_BASELINE_TRAFFIC_PERCENT=0 désactive le reclassement
// pour tout le monde sans redéploiement de code.
const DEFAULT_BASELINE_TRAFFIC_PERCENT = 20

export function resolveBaselineTrafficPercent(): number {
  const raw = process.env.RECOMMENDATION_BASELINE_TRAFFIC_PERCENT
  if (raw === undefined) return DEFAULT_BASELINE_TRAFFIC_PERCENT

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_BASELINE_TRAFFIC_PERCENT
  return Math.min(100, Math.max(0, parsed))
}

// Affectation stable : un même actorId reçoit toujours la même variante pour une version de
// config donnée (jamais un tirage aléatoire à chaque requête). Le hash inclut `version` pour que
// changer la config du score puisse aussi changer la répartition sans dépendre d'un état externe.
export function resolveRankingVariant(
  actorId: string,
  trafficPercent: number,
  version: string,
): RankingVariant {
  if (trafficPercent <= 0) return 'control'
  if (trafficPercent >= 100) return 'baseline'

  const digest = createHash('sha256').update(`${version}:${actorId}`).digest()
  // Les 4 premiers octets suffisent pour un modulo 100 uniformément distribué.
  const bucket = digest.readUInt32BE(0) % 100

  return bucket < trafficPercent ? 'baseline' : 'control'
}
