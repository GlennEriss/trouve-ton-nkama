# Cloud Functions - Scope Critique (Ce qui doit sortir du Next runtime)

## 1. Principe

Une fonctionnalite part en Cloud Function si elle est:

- asynchrone critique
- lourde (batch/aggregation)
- event-driven
- ou necessite isolation/retry robuste

## 2. Fonctions Cloud obligatoires MVP

## 2.1 Ingestion analytics (Firebase/Vercel)

- Job schedule (toutes les 15 min)
- Tirer les metriques sources
- Normaliser payload
- Upsert BigQuery raw
- Recalcul aggregates `daily`

Pourquoi function:

- orchestration batch fiable
- retry et observabilite separes du runtime web

## 2.2 Presence projection et hygiene sessions

- Nettoyage sessions expirees
- Projection presence pour dashboard (snapshots)
- Detection anomalies presence (stale heartbeat)

## 2.3 Notifications in-app critiques

Oui, les notifications in-app critiques doivent etre gerees via Cloud Functions.

Use cases:

- notification systeme (incident platform)
- notification moderation (lot d'annonces bloquees)
- notification finance (remboursement en anomalie)
- notification securite (activite suspecte admin)

Pattern:

- API publie un event
- Function consomme
- ecrit notification in-app
- optional email fallback si criticite haute

## 2.4 Workflows financiers sensibles async

- verification post-remboursement
- reconciliation credits vs transactions
- detection incoherences ledger

## 2.5 Exports lourds

- exports analytics volumineux (CSV/JSON)
- generation en asynchrone + lien de recuperation

## 3. Ce qui reste dans Next API (pas function)

- CRUD admin standards
- lectures dashboard temps reel (non batch)
- mutations simples sans traitement long

## 4. Pattern de fiabilite

- idempotency key par event critique
- retry exponentiel
- dead-letter queue sur echec final
- correlationId propage API -> function -> logs

## 5. Securite Cloud Functions

- service accounts dedies par environnement
- secrets par env (dev/preprod/prod)
- endpoints internes proteges (signed tokens / allowlist)
- aucun secret hardcode

## 6. Monitoring functions

- erreurs: Sentry + logs GCP
- metriques:
- taux succes
- latence execution
- backlog queue
- volume events ingeres
