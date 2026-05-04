# Sprint-by-Sprint Implementation Plan (MVP v1)

## 1. Cadence et gouvernance

- Cadence: sprints de 2 semaines.
- Rythme: planification (J1), sync hebdo, review + retro (fin sprint).
- Regle: aucun scope creep dans un sprint en cours.
- Regle: toute feature doit passer `dev` puis `preprod` avant `prod`.

## 2. Definition of Ready / Definition of Done

Definition of Ready:

- user story avec objectif metier clair
- maquette/UX validee si ecran requis
- permissions RBAC definies
- contrats API cibles identifies
- donnees necessaires identifiees

Definition of Done:

- code conforme conventions architecture
- tests unitaires + integration minimaux verts
- audit log present sur mutations sensibles
- securite API appliquee (`/api/admin/v1`, validation `zod`, RBAC)
- documentation mise a jour

## 3. Vue macro des sprints

| Sprint | Theme | Resultat attendu |
|---|---|---|
| Sprint 0 | Foundations & Setup | socle projet, outillage, standards, CI de base |
| Sprint 1 | IAM & Security Core | auth admin, RBAC runtime, audit log v1 |
| Sprint 2 | Admin Management | listing admins, invitations, roles, presence admin |
| Sprint 3 | Users & Announcers Ops | listing/recherche users, presence users, annonceurs |
| Sprint 4 | Listing Moderation | file moderation, approve/reject, bulk de base |
| Sprint 5 | Finance Core | packs, credits manuels, transactions, remboursements MVP |
| Sprint 6 | Analytics Core | recherches 7j + visites Firebase/Vercel centralisees |
| Sprint 7 | Hardening & Go-Live | securite/perf, preprod full pass, release MVP v1 |

## 4. Detail sprint par sprint

## Sprint 0 - Foundations & Setup

Objectif:

- Verrouiller les fondations techniques pour developper vite et proprement.

Scope:

- bootstrap Next.js admin finalise
- installation stack UI: shadcn/ui, radix, lucide-react
- setup state: TanStack Query + Zustand
- structure modules/couches (modular monolith)
- setup environnement local/dev/preprod/prod
- CI de base (lint, typecheck, tests)

Livrables:

- arborescence cible en place
- conventions de nommage + architecture appliquees
- pipeline CI basique operationnelle

Exit criteria:

- app tourne localement
- deploy dev ok
- checks CI verts sur PR

## Sprint 1 - IAM & Security Core

Objectif:

- Mettre en place la securite structurante du dashboard admin.

Scope:

- auth admin via Firebase Auth
- session cookie securisee
- middleware guard `/api/admin/v1/*`
- moteur RBAC runtime (`requirePermission`)
- audit log v1 pour actions sensibles
- codes erreurs API harmonises

Livrables:

- endpoints admin proteges
- policy RBAC branchable par module
- audit log minimal exploitable

Exit criteria:

- aucun endpoint admin accessible sans auth
- test matrix allow/deny RBAC initiale validee
- audit log present sur mutations critiques

## Sprint 2 - Admin Management

Objectif:

- Donner le controle operationnel des comptes admins.

Scope:

- liste admins
- invitation admin par role
- activation/suspension/revocation admin
- affichage admins online + derniere connexion
- ecran roles lecture + assignation role

Livrables:

- module `admin_management` fonctionnel
- workflow invitation complet
- presence admin visible en dashboard

Exit criteria:

- scenario critique: super_admin invite + assigne role + activation ok
- operations sensibles journalisees

## Sprint 3 - Users & Announcers Ops

Objectif:

- Couvrir le support operationnel users/annonceurs.

Scope:

- liste/recherche utilisateurs
- detail utilisateur
- utilisateurs online + `last_seen_at`
- suspend/reactivate user selon RBAC
- liste/consultation annonceurs

Livrables:

- module `user_management` et `announcer_management` MVP
- filtres et pagination de base

Exit criteria:

- scenario critique presence user valide
- restrictions RBAC support/ops appliquees

## Sprint 4 - Listing Moderation

Objectif:

- Rendre la moderation quotidienne operationnelle.

Scope:

- file moderation (pending/approved/rejected)
- approve/reject avec motif
- historique decisions
- bulk moderation de base

Livrables:

- module `listing_moderation` MVP
- audit complet decisions moderation

Exit criteria:

- scenario critique moderation_admin valide
- moderation sans acces finance verifiee

## Sprint 5 - Finance Core

Objectif:

- Couvrir les operations credits/transactions/remboursements MVP.

Scope:

- lecture/modification packs credits (roles autorises)
- attribution manuelle credits
- consultation transactions globales
- initier/valider remboursement MVP
- idempotency sur operations critiques

Livrables:

- module `finance_credits` MVP
- protections anti double-traitement

Exit criteria:

- scenario critique finance_admin valide
- audit + idempotency valides sur credits/refunds

## Sprint 6 - Analytics Core

Objectif:

- Centraliser la lecture business et produit dans le dashboard.

Scope:

- pipeline ingestion Firebase/Vercel analytics (Cloud Functions)
- tables/aggregats BigQuery
- dashboard recherches (7 jours par defaut)
- KPI recherches: volume, top queries, prix/types, avec/sans resultats
- dashboard visites: Firebase vs Vercel comparatif

Livrables:

- module `analytics_insights` MVP
- jobs ingestion + agregation operationnels
- backlog executable detaille: `docs/architecture/SPRINT-6-ANALYTICS-IMPLEMENTATION-BACKLOG.md`
- spec implementation ready ANL-001/002: `docs/architecture/ANL-001-ANL-002-BIGQUERY-DDL-ZOD-SPEC.md`
- matrice delivery owner/estimation/priorite: `docs/architecture/SPRINT-6-ANALYTICS-DELIVERY-MATRIX.md`

Exit criteria:

- comparaison Firebase/Vercel visible et comprehensible
- recherche 7 jours exploitable metierement

## Sprint 7 - Hardening & Go-Live

Objectif:

- Stabiliser et securiser avant mise en production MVP v1.

Scope:

- campagne de tests transverses
- hardening API/security (csrf, rate-limit, replay)
- optimisation perf ecrans critiques
- preprod full run + correction defects bloquants
- runbook release + rollback

Livrables:

- release candidate MVP v1
- checklist go-live signee

Exit criteria:

- criteres d'acceptation MVP v1 tous valides
- zero defect bloquant ouvert
- promotion prod approuvee

## 5. Flux transverse (chaque sprint)

- Documentation continue mise a jour.
- Revue securite sur nouvelles mutations.
- Revue RBAC sur nouveaux ecrans/actions.
- Observabilite: logs + Sentry + correlation id.

## 6. KPI de pilotage sprint

- Sprint predictability: stories completees / stories engagees.
- Defect escape rate preprod -> prod.
- Taux de couverture des tests critiques.
- Lead time story (ready -> done).
- Taux de rework apres review metier.

## 7. Politique de changement de scope

- Changement mineur: autorise si sans impact sprint goal.
- Changement majeur: bascule au sprint suivant sauf incident critique.
- Hors perimetre MVP: bascule backlog `v1.x` ou `v2`.

## 8. Backlog v1.x / v2 (post-MVP)

- roles personnalises
- scopes geographiques par role
- BI multi-source avancee
- automatisations IA support/moderation
