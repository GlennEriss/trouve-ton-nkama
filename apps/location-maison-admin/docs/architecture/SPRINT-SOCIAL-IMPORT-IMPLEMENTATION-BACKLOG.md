# Sprint Social Import - Backlog d'Implementation (Tickets API/UI Executables)

## 1. Objectif

Transformer la checklist RBAC `social_import` en backlog directement implementable, sprint par sprint, avec tickets API/UI, dependances, criteres d'acceptation et estimations.

References:

- `docs/MATRICE-PERMISSIONS-SOCIAL-IMPORT-ECRANS-ACTIONS.md`
- `docs/architecture/CHECKLIST-IMPLEMENTATION-RBAC-SOCIAL-IMPORT.md`
- `docs/architecture/ARCHITECTURE-OPERATIONNELLE-IMPORT-ANNONCES-RESEAUX-SOCIAUX.md`

## 2. Hypotheses de planification

- Sprint cadence: 2 semaines.
- Priorite immediate: Lot 1 (lecture + socle RBAC + data model).
- La gestion session Facebook est une exigence par defaut du module (pas un workstream optionnel).
- Deny-by-default obligatoire sur API et UI.
- Verrouillage stockage brut: pas de suppression automatique (pas de lifecycle delete) tant que la strategie dataset evolutif n'est pas finalisee.

## 3. Decoupage macro

- Sprint SI-1: Socle IAM + Data + APIs lecture + UI lecture.
- Sprint SI-2: Mutations operationnelles non-prod (sources, dry-run, reject, retry).
- Sprint SI-3: Mutations critiques prod (publish, run prod, scheduler, export, hardening).

## 4. Backlog tickets (ordre recommande)

| ID | Stream | Sprint | Tache | Dependances | Definition of Done |
|---|---|---|---|---|---|
| SI-001 | IAM | SI-1 | Ajouter permissions `social_import.*` au catalogue + mapping roles MVP | - | Permissions resolvables runtime, tests allow/deny basiques verts |
| SI-002 | IAM/API | SI-1 | Ajouter guard RBAC standard `requireAdmin(permission)` sur namespace `/social-import` | SI-001 | Toutes routes social-import renvoient `403` uniforme sans permission |
| SI-003 | Data | SI-1 | Creer modeles Firestore `announcer_import_sources`, `social_import_jobs`, `social_import_decisions`, `social_import_settings` + socle stockage brut GCS | - | Collections + schemas + indexes minimum documentes et valides en dev; buckets `social-import-raw-dev`/`social-import-raw-prod` crees; arborescence brute standard appliquee; lifecycle delete desactive |
| SI-004 | API | SI-1 | Implementer `GET /social-import/sources` (filtres + pagination) | SI-002, SI-003 | Lecture sources operationnelle, `social_import.source.read` applique |
| SI-005 | API | SI-1 | Implementer `GET /social-import/jobs` + `GET /social-import/jobs/{id}` | SI-002, SI-003 | Liste/detail jobs avec filtres `status/announcer/date` |
| SI-006 | API | SI-1 | Implementer `GET /social-import/review` | SI-002, SI-003 | File de candidates exposee avec champs minimaux review |
| SI-007 | API | SI-1 | Implementer `GET /social-import/decisions` | SI-002, SI-003 | Timeline decisions accessible, filtres `jobId/decision` |
| SI-008 | UI | SI-1 | Creer shell pages `/dashboard/social-import/*` + navigation RBAC | SI-001 | Pages visibles seulement si `social_import.read` |
| SI-009 | UI | SI-1 | Ecran Sources (lecture seule) | SI-004, SI-008 | Table sources + etat + empty/error states |
| SI-010 | UI | SI-1 | Ecran Jobs (lecture seule) | SI-005, SI-008 | Liste jobs + detail + compteurs + filtres |
| SI-011 | UI | SI-1 | Ecran Review (lecture seule) | SI-006, SI-008 | Liste candidates + detail brut vs structure |
| SI-012 | UI | SI-1 | Ecran Decisions/Observabilite (lecture seule) | SI-007, SI-008 | Timeline decisions + KPI simples |
| SI-013 | API | SI-2 | Implementer `POST /social-import/sources` + `PATCH /social-import/sources/{id}` | SI-002, SI-003 | Create/update source avec validation `zod` + audit |
| SI-014 | API | SI-2 | Implementer `POST /social-import/sources/{id}/pause` + `.../revoke` (reason obligatoire) | SI-013 | Transitions statut controlees + audit critique |
| SI-015 | API | SI-2 | Nettoyage API sources (contrat simplifie) | SI-013 | Contrats API sources simplifies et coherents |
| SI-016 | API/Orchestration | SI-2 | Implementer `POST /social-import/jobs/dry-run` | SI-005 | Dry-run declenchable, `jobId` + `correlationId` renvoyes |
| SI-017 | API/Orchestration | SI-2 | Implementer `POST /social-import/jobs/{jobId}/retry` | SI-005 | Retry conditionnel au statut + idempotency key |
| SI-018 | API | SI-2 | Implementer `POST /social-import/review/{id}/reject` (motif obligatoire) | SI-006 | Reject operationnel + taxonomie motif + audit decision |
| SI-019 | UI | SI-2 | Mutations Sources + Consentement (formulaires/confirmations) | SI-013, SI-014, SI-015 | Actions visibles selon permissions, messages erreurs clairs |
| SI-020 | UI | SI-2 | Actions dry-run + retry jobs | SI-016, SI-017 | Boutons conditionnels, feedback `running/success/error` |
| SI-021 | UI | SI-2 | Action reject candidate + modal motif | SI-018 | Reject depuis review avec validation motif cote UI/API |
| SI-022 | API | SI-3 | Implementer `POST /social-import/review/{id}/publish` (idempotent) | SI-006 | Publication unique, rattachement annonceur garanti |
| SI-023 | API/Orchestration | SI-3 | Implementer `POST /social-import/jobs/run` (prod) | SI-016 | Run prod reserve + confirmation/motif + audit critique |
| SI-024 | API | SI-3 | Implementer settings + scheduler (`GET/PATCH settings`, toggle scheduler) | SI-002, SI-003 | Parametrage module + planification securisee |
| SI-025 | API | SI-3 | Implementer exports (`jobs`, `rejections`, `kpi`) alignes filtres | SI-005, SI-007 | Exports CSV conformes a la vue courante |
| SI-026 | UI | SI-3 | Actions publish + run prod + settings + exports | SI-022, SI-023, SI-024, SI-025 | Flows critiques complets avec confirmations fortes |
| SI-027 | SecOps | SI-3 | Hardening: rate-limit, correlationId, audit coverage, messages 403/409 | SI-022..SI-026 | Checklist securite completee, revue architecture validee |
| SI-028 | QA | SI-3 | Campagne QA/UAT + go/no-go | SI-027 | Tests parcours roles MVP verts, rapport UAT signe |

## 5. Tickets API/UI prets a implementer (format execution)

## 5.1 Ticket type API

- Endpoint(s):
- Permission(s) requise(s):
- Validation `zod`:
- Regles metier:
- Audit (action/resource/reason obligatoire?):
- Codes retour attendus (`200/201/400/403/409`):
- Tests minimaux:

## 5.2 Ticket type UI

- Ecran/section:
- Permission gate page:
- Permission gate action:
- Etats UX (`loading/empty/error/success`):
- Confirmations requises:
- Telemetrie/audit attendus cote API:
- Critere d'acceptation visuel/fonctionnel:

## 6. Delivery matrix (owner/estimation/priorite)

| Ticket | Owner principal | Owner secondaire | Estimation (SP) | Priorite | Cible |
|---|---|---|---:|---|---|
| SI-001..SI-003 | BE | SECOPS | 13 | P0 | SI-1 W1 |
| SI-004..SI-007 | BE | DATA | 16 | P0 | SI-1 W1-W2 |
| SI-008..SI-012 | FE | BE | 13 | P1 | SI-1 W2 |
| SI-013..SI-018 | BE | SECOPS | 18 | P0 | SI-2 W1 |
| SI-019..SI-021 | FE | BE | 10 | P1 | SI-2 W2 |
| SI-022..SI-025 | BE | SECOPS | 16 | P0 | SI-3 W1 |
| SI-026 | FE | BE | 5 | P1 | SI-3 W2 |
| SI-027 | SECOPS | BE | 5 | P0 | SI-3 W2 |
| SI-028 | QA | PO | 5 | P1 | SI-3 W2 |

Total estime:

- `81 SP`
- Equipe reduite (solo + support): `5 a 7 semaines` selon disponibilite.

## 7. Checkpoints de pilotage

- Checkpoint A (fin SI-1): lecture complete (sources/jobs/review/decisions) + UI lecture.
- Checkpoint B (fin SI-2): mutations non-prod + reject/retry operationnels.
- Checkpoint C (fin SI-3): publish/run prod/scheduler/export + hardening + UAT.

## 8. Criteres de sortie du module social import

- Toutes les permissions `social_import.*` ciblees sont implementees.
- Tous les endpoints critiques sont proteges RBAC + audit.
- Toutes les actions UI sont gatees par permission.
- Les operations prod exigent un motif et une tracabilite complete.
- Les roles MVP produisent exactement les droits de la matrice.
