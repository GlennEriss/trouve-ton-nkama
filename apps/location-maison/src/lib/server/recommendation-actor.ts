import { resolveStatisticsActor } from './statistics-actor'

// Réutilise tel quel le mécanisme de pseudonymisation déjà en place pour
// property_statistics (hash SHA-256 tronqué, jamais l'UID/visitorId en clair) — voir
// docs/recommendation-ml/AVANT-IMPLEMENTATION.md §5 (décision consentement/rétention).
export function resolveRecommendationActor(
  request: Pick<Request, 'headers'>,
  suppliedVisitorId?: unknown,
): string {
  return resolveStatisticsActor(request, suppliedVisitorId)
}
