# Matrice Permissions Social Import (Ecran/Action)

## Objectif

Definir une matrice RBAC operationnelle pour le module d'import d'annonces reseaux sociaux:

- gouvernance des sources annonceurs
- execution des jobs d'import
- revue qualite des annonces candidates
- publication/rejet
- supervision, relance, export

Document pret a brancher cote UI + API.

## Roles (MVP)

- `super_admin`
- `operations_admin`
- `moderation_admin`
- `finance_admin`
- `support_admin`
- `analyst_admin`

## Legende

- `Y`: autorise
- `N`: non autorise
- `Y*`: autorise avec condition metier

## Convention permissions

Format: `<resource>.<action>`

Exemples:

- `social_import.read`
- `social_import.source.update`
- `social_import.run.prod`
- `social_import.publish`

## Inventaire permissions Social Import (cible)

- `social_import.read`
- `social_import.export`
- `social_import.source.read`
- `social_import.source.create`
- `social_import.source.update`
- `social_import.source.pause`
- `social_import.source.revoke`
- `social_import.run`
- `social_import.run.dry`
- `social_import.run.prod`
- `social_import.job.read`
- `social_import.job.retry`
- `social_import.review`
- `social_import.publish`
- `social_import.reject`
- `social_import.decision.read`
- `social_import.settings.read`
- `social_import.settings.update`
- `social_import.scheduler.manage`

## 1) Ecran Sources annonceur (`/dashboard/social-import/sources`)

Permissions utilisees:

- `social_import.read`
- `social_import.source.read`
- `social_import.source.create`
- `social_import.source.update`
- `social_import.source.pause`
- `social_import.source.revoke`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Ouvrir l'ecran sources importables | Y | Y | Y | N | Y | Y |
| Lister les sources par annonceur | Y | Y | Y | N | Y | Y |
| Voir statut source (active/pause/revoke) | Y | Y | Y | N | Y | Y |
| Ajouter une nouvelle source | Y | Y | N | N | Y* | N |
| Modifier une source (url, type) | Y | Y | N | N | Y* | N |
| Mettre en pause une source | Y | Y | Y | N | Y* | N |
| Revoquer une source | Y | Y | N | N | N | N |

Condition `Y*`:

- `support_admin` autorise uniquement sur sources sans litige et sans impact legal ouvert.

## 2) Ecran Jobs import (`/dashboard/social-import/jobs`)

Permissions utilisees:

- `social_import.read`
- `social_import.job.read`
- `social_import.run`
- `social_import.run.dry`
- `social_import.run.prod`
- `social_import.job.retry`
- `social_import.export`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir la liste des jobs | Y | Y | Y | N | Y | Y |
| Voir detail d'un job (logs, compteurs) | Y | Y | Y | N | Y | Y |
| Lancer un dry-run (dev) | Y | Y | Y | N | Y* | N |
| Lancer un run production | Y | Y | N | N | N | N |
| Relancer un job en echec | Y | Y | Y* | N | N | N |
| Exporter rapport jobs CSV | Y | Y | Y | N | N | Y |

Condition `Y*`:

- `support_admin` dry-run seulement, jamais en prod.
- `moderation_admin` retry autorise uniquement sur jobs `needs_review` ou `partial`, pas sur erreurs infrastructure critiques.

## 3) Ecran Revue candidates (`/dashboard/social-import/review`)

Permissions utilisees:

- `social_import.read`
- `social_import.review`
- `social_import.publish`
- `social_import.reject`
- `social_import.decision.read`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir les annonces candidates importees | Y | Y | Y | N | Y | Y |
| Ouvrir le detail post brut vs annonce structuree | Y | Y | Y | N | Y | Y |
| Voir les motifs de validation/rejet auto | Y | Y | Y | N | Y | Y |
| Publier une annonce candidate | Y | Y | Y | N | N | N |
| Rejeter une annonce candidate | Y | Y | Y | N | Y* | N |
| Rejeter avec motif obligatoire | Y | Y | Y | N | Y* | N |
| Voir historique des decisions | Y | Y | Y | N | Y | Y |

Condition `Y*`:

- `support_admin` peut rejeter uniquement avec taxonomie de motifs de support; pas de publication.

## 4) Ecran Parametres import (`/dashboard/social-import/settings`)

Permissions utilisees:

- `social_import.settings.read`
- `social_import.settings.update`
- `social_import.scheduler.manage`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir les parametres du module import | Y | Y | Y | N | Y | Y |
| Modifier seuils (qualite/dedup) | Y | Y | N | N | N | N |
| Modifier frequence planification | Y | Y | N | N | N | N |
| Activer/desactiver ordonnanceur | Y | N | N | N | N | N |

## 5) Ecran Observabilite import (`/dashboard/social-import/observability`)

Permissions utilisees:

- `social_import.read`
- `social_import.export`
- `social_import.decision.read`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir KPI import (publish/reject/error) | Y | Y | Y | N | Y | Y |
| Voir distribution erreurs et motifs | Y | Y | Y | N | Y | Y |
| Exporter KPI/rejets CSV | Y | Y | Y | N | N | Y |

## 6) Conditions globales obligatoires

- Deny-by-default sur UI + API.
- Toute action `run.prod`, `publish`, `reject`, `revoke`, `scheduler.manage` doit exiger:
  - `reason` obligatoire,
  - audit log complet,
  - `correlationId`.
- Les actions de publication/rejet doivent etre idempotentes.

## 7) Dependances API (gate minimal)

Chaque route doit verifier la permission dediee:

- `GET /api/admin/v1/social-import/sources` -> `social_import.source.read`
- `POST /api/admin/v1/social-import/sources` -> `social_import.source.create`
- `PATCH /api/admin/v1/social-import/sources/{id}` -> `social_import.source.update`
- `POST /api/admin/v1/social-import/sources/{id}/pause` -> `social_import.source.pause`
- `POST /api/admin/v1/social-import/sources/{id}/revoke` -> `social_import.source.revoke`
- `POST /api/admin/v1/social-import/jobs/dry-run` -> `social_import.run.dry`
- `POST /api/admin/v1/social-import/jobs/run` -> `social_import.run.prod`
- `GET /api/admin/v1/social-import/jobs` -> `social_import.job.read`
- `POST /api/admin/v1/social-import/jobs/{jobId}/retry` -> `social_import.job.retry`
- `GET /api/admin/v1/social-import/review` -> `social_import.review`
- `POST /api/admin/v1/social-import/review/{id}/publish` -> `social_import.publish`
- `POST /api/admin/v1/social-import/review/{id}/reject` -> `social_import.reject`
- `GET /api/admin/v1/social-import/decisions` -> `social_import.decision.read`
- `GET /api/admin/v1/social-import/settings` -> `social_import.settings.read`
- `PATCH /api/admin/v1/social-import/settings` -> `social_import.settings.update`
- `POST /api/admin/v1/social-import/scheduler/toggle` -> `social_import.scheduler.manage`

## 8) Audit log obligatoire

Mutations a auditer:

- creation/mise a jour/pause/revocation de source
- lancement dry-run/run prod
- retry job
- publication/rejet candidate
- modification parametres import
- activation/desactivation scheduler

Champs minimaux d'audit:

- `actorId`
- `actorRoles`
- `action`
- `resource`
- `resourceId`
- `reason`
- `before`
- `after`
- `correlationId`
- `timestamp`

## 9) Ecart actuel vs cible (a traiter pendant implementation)

Etat actuel:

- Le module social import n'expose pas encore un RBAC granulaire dedie.

Permissions a ajouter:

- toutes les permissions listees dans "Inventaire permissions Social Import (cible)".

Priorite d'implementation:

1. `social_import.read`, `social_import.source.read`, `social_import.job.read`, `social_import.review`
2. `social_import.run.dry`, `social_import.publish`, `social_import.reject`
3. `social_import.run.prod`, `social_import.source.revoke`, `social_import.scheduler.manage`
4. `social_import.settings.update`, `social_import.export`
