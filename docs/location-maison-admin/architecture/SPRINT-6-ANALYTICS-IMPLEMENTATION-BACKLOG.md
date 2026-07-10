# Sprint 6 Analytics - Backlog d'Implementation (Tickets Executables)

## 1. Objectif

Transformer le contrat analytics v1 en taches executables, avec ordre d'implementation, dependances et criteres d'acceptation.

Reference contractuelle:

- `docs/architecture/ANALYTICS-DATA-CONTRACT-V1.md`

## 2. Decoupage sprint

- Semaine 1: socle data + ingestion + projections.
- Semaine 2: endpoints dashboard + UI analytics + hardening.

## 3. Backlog tickets (ordre recommande)

| ID | Stream | Sprint | Tache | Dependances | Definition of Done |
|---|---|---|---|---|---|
| ANL-001 | Data Platform | S6-W1 | Creer dataset/tables BigQuery `analytics_events_raw`, `search_events`, `presence_events`, `traffic_events_raw`, `*_daily` | Contrat v1 | DDL applique en `dev`, partition/clustering valides, dry-run requetes OK |
| ANL-002 | Backend API | S6-W1 | Implementer `POST /api/admin/v1/analytics/events:ingest` (batch, strict validation, idempotency key) | ANL-001 | Endpoint accepte 1..500 events, rejections tracees, `409` sur replay payload different |
| ANL-003 | Cloud Functions | S6-W1 | Implementer adaptateur `search_performed` + `search_result_returned` depuis catalogue/search bar | ANL-002 | Events arrives en raw + projection `search_events`, taux rejet < 1% en test |
| ANL-004 | Cloud Functions | S6-W1 | Implementer adaptateur `user_presence_heartbeat` (user/admin) | ANL-002 | Snapshot presence calcule, online/offline coherent avec seuil 5 min |
| ANL-005 | Cloud Functions | S6-W1 | Implementer adaptateur `platform_visit` pour `firebase_analytics` + `vercel_analytics` vers contrat commun | ANL-002 | Flux des 2 providers visibles en raw, dedupe `(source, provider_event_id)` actif |
| ANL-006 | Data Platform | S6-W1 | Jobs agregation `search_metrics_daily`, `presence_snapshots_5min`, `traffic_metrics_daily`, `traffic_comparison_daily` | ANL-003/004/005 | Jobs planifies, freshness cibles respectees (`<=5min`, `<=30s`, `<=15min`) |
| ANL-007 | Backend API | S6-W2 | Implementer endpoints lecture recherches (`/searches`, `/top-queries`, `/result-rate`) | ANL-006 | Defaut `range=7d`, filtres valides, pagination/limits testes |
| ANL-008 | Backend API | S6-W2 | Implementer endpoints lecture presence (`users-online`, `admins-online`, `users-last-seen`, `admins-last-login`) | ANL-006 | Reponses coherentes avec snapshots, curseurs stables |
| ANL-009 | Backend API | S6-W2 | Implementer endpoints visites (`/traffic`, `/traffic/compare`) | ANL-006 | Comparatif Firebase/Vercel exploitable sur 7 jours |
| ANL-010 | Frontend Dashboard | S6-W2 | Ecran Analytics Recherches (volume, top queries, taux avec/sans resultat) | ANL-007 | Vue chargee en < 2s en dev, filtres range/source operationnels |
| ANL-011 | Frontend Dashboard | S6-W2 | Ecran Analytics Presence (online + derniere activite users/admins) | ANL-008 | Compteurs et listings coherents, refresh sans rechargement complet |
| ANL-012 | Frontend Dashboard | S6-W2 | Ecran Analytics Visites centralisees (Firebase vs Vercel) | ANL-009 | KPIs comparatifs + export CSV disponibles |
| ANL-013 | Security & Ops | S6-W2 | RBAC analytics + rate limits + audit + correlationId end-to-end | ANL-007/008/009 | Permissions appliquees (`analytics.search_read`, `analytics.traffic_read`), audit en place |
| ANL-014 | QA & Data Quality | S6-W2 | Campagne de tests integres + tests data quality + tests non-regression | ANL-010/011/012/013 | Rapport QA vert, anomalies classees, go/no-go formalise |

## 4. Detaillage implementation par stream

## 4.1 Stream Data Platform

- Appliquer DDL BigQuery avec partition par `occurred_at`.
- Ajouter clustering par `event_name`, `source`, `environment` sur raw.
- Mettre en place requetes d'agregation incremental + recalcul nocturne.

## 4.2 Stream Ingestion/API

- Validation stricte `zod` basee sur le contrat v1.
- Enforcer `Idempotency-Key` + fingerprint payload.
- Ecrire les rejets dans une table dediee pour diagnostic.

## 4.3 Stream Cloud Functions

- Orchestration schedulee toutes les 15 min pour visites.
- Retries exponentiels + DLQ.
- Emission metriques techniques (volume, latence, erreurs).

## 4.4 Stream Frontend Dashboard

- Utiliser APIs `v1` uniquement.
- Defaut global de periode: `7d`.
- Export CSV pour recherches et visites depuis le dashboard.

## 5. Matrice des dependances critiques

- Sans ANL-001/002: aucun stream aval fiable.
- Sans ANL-006: dashboards non deterministes.
- Sans ANL-013: risque securite en mise en prod.
- Sans ANL-014: risque de derive data/metier non detecte.

## 6. Checklist de sortie Sprint 6

- Tous les events MVP ingeres et validables (`search_performed`, `search_result_returned`, `user_presence_heartbeat`, `platform_visit`).
- Dashboard analytics operationnel avec defaut `7d`.
- Comparatif Firebase/Vercel lisible dans un seul ecran.
- Taux de rejet events documente et sous controle.
- Documentation a jour (contrat + backlog + runbook).

## 7. Backlog immediat post-sprint (S7 si glissement)

- ANL-X1: alerting proactive sur anomalies de collecte (trou de donnees > 30 min).
- ANL-X2: optimisation cout BigQuery (materialized views / partition pruning).
- ANL-X3: ajout exports planifies (rapport quotidien mail/drive).
