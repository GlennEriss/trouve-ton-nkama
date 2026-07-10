# Etape 2 - Couche technique de tracking

## Objectif

Centraliser l'emission des evenements pour:

- eviter la duplication
- garantir un payload propre
- changer de provider sans toucher tous les composants

## Architecture cible

Nouveau module:

- `src/features/analytics/tracking/`

Structure proposee:

- `src/features/analytics/tracking/domain/events.ts`
- `src/features/analytics/tracking/domain/payloads.ts`
- `src/features/analytics/tracking/services/tracker.interface.ts`
- `src/features/analytics/tracking/services/vercel-tracker.service.ts`
- `src/features/analytics/tracking/services/internal-tracker.service.ts`
- `src/features/analytics/tracking/services/tracker.service.ts`
- `src/features/analytics/tracking/hooks/useTrackEvent.ts`

## Strategie provider

V1:

- Provider unique: Google Analytics 4 (Firebase Analytics) pour pages et events web.
- Les stats metier annonces existantes restent sur API/Firestore.

Le `tracker.service.ts` centralise les appels `logEvent` GA4.

## Regles d'implementation

1. Un composant UI ne parle jamais directement a un SDK analytics.
2. Un composant utilise seulement `useTrackEvent()`.
3. Le service applique sanitation avant emission (pas d'email brut, pas de telephone brut).
4. Les evenements critiques utilisent une cle d'idempotence quand necessaire.

## Migration progressive

1. brancher Home/Search/PropertyDetails
2. brancher Auth (signin/signup/google)
3. brancher Credits/Favoris
4. retirer anciens appels tracking disperses

## Criteres d'acceptation

1. Les pages ciblees envoient des events via la nouvelle couche.
2. Aucun event critique n'est envoye hors service central.
3. En cas d'echec GA4, le flux utilisateur n'est pas bloque.
