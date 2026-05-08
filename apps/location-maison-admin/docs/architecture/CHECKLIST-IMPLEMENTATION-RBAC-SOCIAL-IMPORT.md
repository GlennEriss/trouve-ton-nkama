# Checklist Implementation RBAC - Social Import (Backend/Frontend)

## 1. Objectif

Fournir une checklist executable, permission par permission, pour implementer le module `social_import` dans `location-maison-admin`.

Reference fonctionnelle:

- `../MATRICE-PERMISSIONS-SOCIAL-IMPORT-ECRANS-ACTIONS.md`

## 2. Prerequis transverses (a faire en premier)

- [ ] Ajouter les permissions `social_import.*` dans le catalogue IAM (`permissions.ts`).
- [ ] Mapper ces permissions dans les roles MVP (`super_admin`, `operations_admin`, etc.).
- [ ] Ajouter les traductions/labels permission lisibles dans l'UI IAM.
- [ ] Ajouter la convention d'audit pour ce module (`resource = social_import_*`).

## 3. Checklist permission par permission

## 3.1 Read and list

### Permission `social_import.read`

Backend:

- [ ] Proteger chaque endpoint `GET /api/admin/v1/social-import/*` avec gate RBAC.
- [ ] Retourner `403` uniforme si permission absente.

Frontend:

- [ ] Masquer l'entree sidebar/menu si permission absente.
- [ ] Bloquer l'acces route `/dashboard/social-import/*` (redirect + message permission).

### Permission `social_import.source.read`

Backend:

- [ ] Gate RBAC sur `GET /social-import/sources`.
- [ ] Journaliser les acces lecture sensibles (optionnel: audit `read_sensitive`).

Frontend:

- [ ] Afficher liste sources uniquement si autorise.
- [ ] Afficher etat source/consentement en mode lecture seule si `source.update` absent.

### Permission `social_import.job.read`

Backend:

- [ ] Gate RBAC sur `GET /social-import/jobs`.
- [ ] Standardiser pagination/filtres (`status`, `announcerUid`, `dateRange`).

Frontend:

- [ ] Rendre l'ecran jobs avec fallback "permission manquante".
- [ ] Afficher logs/summaries sans actions si permissions mutation absentes.

### Permission `social_import.review`

Backend:

- [ ] Gate RBAC sur `GET /social-import/review`.
- [ ] Exposer colonnes minimales pour decision (`candidateId`, `announcerUid`, `reasonAuto`, `score`).

Frontend:

- [ ] Afficher la file review.
- [ ] Afficher detail brut vs structure sans boutons publier/rejeter si permissions manquantes.

### Permission `social_import.decision.read`

Backend:

- [ ] Gate RBAC sur `GET /social-import/decisions`.
- [ ] Filtrer par `jobId`, `announcerUid`, `decision`.

Frontend:

- [ ] Ajouter onglet "Historique decisions".
- [ ] Afficher timeline avec acteur, motif, date.

## 3.2 Source governance

### Permission `social_import.source.create`

Backend:

- [ ] Gate RBAC sur `POST /social-import/sources`.
- [ ] Validation `zod`: `announcerUid`, `platform`, `sourceUrl`, `sourceType`, `status`.
- [ ] Audit mutation obligatoire.

Frontend:

- [ ] Activer bouton "Ajouter source" uniquement si autorise.
- [ ] Afficher erreurs validation back de maniere explicite.

### Permission `social_import.source.update`

Backend:

- [ ] Gate RBAC sur `PATCH /social-import/sources/{id}`.
- [ ] Validation des transitions de statut autorisees.
- [ ] Audit before/after obligatoire.

Frontend:

- [ ] Activer edition inline/formulaire.
- [ ] Afficher mode lecture seule si permission absente.

### Permission `social_import.source.pause`

Backend:

- [ ] Gate RBAC sur `POST /social-import/sources/{id}/pause`.
- [ ] Exiger `reason` non vide.
- [ ] Audit obligatoire.

Frontend:

- [ ] Ajouter action "Mettre en pause" avec confirmation.
- [ ] Forcer saisie motif.

### Permission `social_import.source.revoke`

Backend:

- [ ] Gate RBAC sur `POST /social-import/sources/{id}/revoke`.
- [ ] Exiger `reason` + verrouiller executions futures.
- [ ] Audit obligatoire (action critique).

Frontend:

- [ ] Action destructive avec double confirmation.
- [ ] Badge visuel `revoked`.

### Permission `social_import.consent.manage`

Backend:

- [ ] Gate RBAC sur mise a jour consentement (`proofRef`, `grantedAt`, `expiresAt`).
- [ ] Bloquer run prod si consentement invalide.

Frontend:

- [ ] Formulaire consentement (preuve/date/statut).
- [ ] Afficher alertes de validite/expiration.

## 3.3 Jobs execution

### Permission `social_import.run`

Backend:

- [ ] Permission parent optionnelle (coherence policy) sur endpoints de lancement.

Frontend:

- [ ] Afficher bloc "Executer import" si presente.

### Permission `social_import.run.dry`

Backend:

- [ ] Gate RBAC sur `POST /social-import/jobs/dry-run`.
- [ ] Imposer environnement `dev`/`staging`.
- [ ] Audit lancement job.

Frontend:

- [ ] Bouton "Dry-run" actif si autorise.
- [ ] Afficher correlationId/jobId en retour.

### Permission `social_import.run.prod`

Backend:

- [ ] Gate RBAC sur `POST /social-import/jobs/run`.
- [ ] Exiger confirmation explicite + `reason`.
- [ ] Refuser si consentement source absent/revoque.
- [ ] Audit critique obligatoire.

Frontend:

- [ ] Bouton run prod reserve.
- [ ] Dialogue avec warning fort et champ motif obligatoire.

### Permission `social_import.job.retry`

Backend:

- [ ] Gate RBAC sur `POST /social-import/jobs/{jobId}/retry`.
- [ ] Regle metier: retries autorises selon statut (`failed`, `partial`, `needs_review`).
- [ ] Eviter doublons via idempotency key.

Frontend:

- [ ] Action "Relancer" conditionnelle au statut.
- [ ] Afficher resultat relance + nouveau jobId.

## 3.4 Review decisions

### Permission `social_import.publish`

Backend:

- [ ] Gate RBAC sur `POST /social-import/review/{id}/publish`.
- [ ] Idempotence obligatoire (une candidate publiee une seule fois).
- [ ] Audit decision `publish`.

Frontend:

- [ ] Bouton "Publier" visible uniquement si autorise.
- [ ] Mise a jour optimiste prudente + rollback sur erreur.

### Permission `social_import.reject`

Backend:

- [ ] Gate RBAC sur `POST /social-import/review/{id}/reject`.
- [ ] `reason` obligatoire (taxonomie + note libre optionnelle).
- [ ] Audit decision `reject`.

Frontend:

- [ ] Bouton "Rejeter" avec modal motif obligatoire.
- [ ] Afficher motif dans timeline decision.

## 3.5 Settings and scheduler

### Permission `social_import.settings.read`

Backend:

- [ ] Gate RBAC sur `GET /social-import/settings`.

Frontend:

- [ ] Afficher l'ecran settings en lecture seule si `settings.update` absent.

### Permission `social_import.settings.update`

Backend:

- [ ] Gate RBAC sur `PATCH /social-import/settings`.
- [ ] Validation stricte des seuils (min/max) et cron policy.
- [ ] Audit before/after.

Frontend:

- [ ] Activer formulaires d'edition des seuils.
- [ ] Afficher etats `saving/success/error`.

### Permission `social_import.scheduler.manage`

Backend:

- [ ] Gate RBAC sur action scheduler (enable/disable/update schedule).
- [ ] Journaliser toute modification planification.

Frontend:

- [ ] Switch scheduler reserve aux roles autorises.
- [ ] Confirmation obligatoire avant desactivation.

## 3.6 Export

### Permission `social_import.export`

Backend:

- [ ] Gate RBAC sur exports (`jobs`, `kpi`, `rejections`).
- [ ] Aligner export sur filtres actifs.

Frontend:

- [ ] Boutons export visibles uniquement si autorise.
- [ ] Feedback telechargement (loading/success/error).

## 4. Checklist technique par couche

## 4.1 Backend (API)

- [ ] Ajouter routes sous `/api/admin/v1/social-import/*`.
- [ ] Ajouter validation `zod` de tous payloads mutation.
- [ ] Ajouter middleware `requireAdmin(permission)`.
- [ ] Normaliser format erreur JSON (`403`, `400`, `409`, `500`).
- [ ] Ajouter `correlationId` dans toutes reponses.

## 4.2 Backend (domain/service)

- [ ] Service `source-management` (CRUD + status transitions).
- [ ] Service `job-orchestrator` (dry/prod/retry).
- [ ] Service `review-decision` (publish/reject idempotent).
- [ ] Service `settings` (threshold/scheduler governance).

## 4.3 Frontend

- [ ] Ecrans `sources`, `jobs`, `review`, `settings`, `observability`.
- [ ] Guards RBAC par page + par action.
- [ ] Etats UX standards: `loading`, `empty`, `error`, `success`.
- [ ] Affichage coherent des motifs/refus permission.

## 4.4 Audit and observability

- [ ] Ecrire audit sur toutes mutations sensibles.
- [ ] Tracer `actorId`, `actorRoles`, `reason`, `correlationId`.
- [ ] Ajouter compteurs KPI import (publish/reject/error).

## 5. Validation finale (Definition of Done module)

- [ ] Chaque endpoint social import a un gate RBAC explicite.
- [ ] Chaque bouton mutation est masque/desactive sans permission.
- [ ] Chaque mutation critique exige un motif.
- [ ] Chaque mutation critique est auditee.
- [ ] Les exports respectent les filtres actifs.
- [ ] Les roles MVP produisent le comportement attendu de la matrice.
