# Matrice Permissions Annonces (Ecran/Action)

## Objectif

Definir une matrice **ultra detaillee** pour le module Annonces du dashboard admin:

- listing
- pagination
- filtres/recherche
- detail
- edition
- changements d'etat/statut
- actions bulk
- gestion des doublons

Le document est pret pour implementation API + UI.

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

- `listings.read`
- `listings.search`
- `listings.update`
- `listings.state.update`
- `listings.duplicates.resolve`

## Inventaire permissions Annonces (cible)

- `listings.read`
- `listings.search`
- `listings.export`
- `listings.create`
- `listings.update`
- `listings.media.update`
- `listings.location.update`
- `listings.status.update`
- `listings.state.update`
- `listings.approve`
- `listings.reject`
- `listings.archive`
- `listings.unarchive`
- `listings.bulk.update`
- `listings.bulk.archive`
- `listings.bulk.unarchive`
- `listings.delete.hard`
- `listings.duplicates.read`
- `listings.duplicates.resolve`
- `listings.duplicates.recompute`

## 1) Ecran Listing principal (`/dashboard/listings`)

Permissions utilisees:

- `listings.read`
- `listings.search`
- `listings.export`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Ouvrir l'ecran listing annonces | Y | Y | Y | N | Y | Y |
| Voir KPIs annonces | Y | Y | Y | N | Y | Y |
| Rechercher une annonce | Y | Y | Y | N | Y | Y |
| Filtrer (type/status/state/prix/surface/localisation/date) | Y | Y | Y | N | Y | Y |
| Trier les annonces | Y | Y | Y | N | Y | Y |
| Paginer (curseur) | Y | Y | Y | N | Y | Y |
| Ouvrir detail d'une annonce | Y | Y | Y | N | Y | Y |
| Export CSV listing | Y | Y | Y | N | N | Y |

## 2) Ecran Detail annonce (`/dashboard/listings/[id]`)

Permissions utilisees:

- `listings.read`
- `listings.duplicates.read`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir fiche complete annonce | Y | Y | Y | N | Y | Y |
| Voir historique de modifications | Y | Y | Y | N | Y | Y |
| Voir historique moderation | Y | Y | Y | N | Y | Y |
| Voir createur de l'annonce | Y | Y | Y | N | Y | Y |
| Voir section doublons de l'annonce | Y | Y | Y | N | Y | Y |

## 3) Edition annonce

Permissions utilisees:

- `listings.update`
- `listings.media.update`
- `listings.location.update`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Editer champs generaux (title, description, price, area, tags) | Y | Y | Y* | N | Y* | N |
| Editer champs type-specifiques | Y | Y | Y* | N | Y* | N |
| Editer localisation | Y | Y | Y* | N | Y* | N |
| Ajouter/supprimer images | Y | Y | Y* | N | Y* | N |
| Sauvegarder modifications | Y | Y | Y* | N | Y* | N |

Conditions `Y*`:

- `moderation_admin`: autorise uniquement pour corrections de moderation (pas de changement business majeur).
- `support_admin`: autorise pour correction de support de niveau 1 (typo, media, contact, localisation), pas de changements sensibles.

## 4) Statut et etat annonce

Permissions utilisees:

- `listings.status.update`
- `listings.state.update`
- `listings.archive`
- `listings.unarchive`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Changer `status` (`FOR_RENT` <-> `FOR_SALE`) | Y | Y | Y* | N | N | N |
| Changer `state` (`IN_PROGRESS` <-> `ARCHIVED`) | Y | Y | Y | N | Y* | N |
| Archiver une annonce | Y | Y | Y | N | Y* | N |
| Reactiver une annonce archivee | Y | Y | Y | N | Y* | N |

Conditions `Y*`:

- `moderation_admin` sur `status.update`: autorise seulement avec motif obligatoire + audit.
- `support_admin` sur `state`: pas autorise pour clusters suspects "high confidence duplicate" sans validation operations/super admin.

## 5) Moderation annonces

Permissions utilisees:

- `listings.approve`
- `listings.reject`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Approuver une annonce | Y | Y | Y | N | N | N |
| Rejeter une annonce | Y | Y | Y | N | N | N |
| Rejeter avec motif obligatoire | Y | Y | Y | N | N | N |
| Voir historique moderation | Y | Y | Y | N | Y | Y |

## 6) Actions bulk annonces

Permissions utilisees:

- `listings.bulk.update`
- `listings.bulk.archive`
- `listings.bulk.unarchive`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Selection multiple annonces | Y | Y | Y | N | N | N |
| Bulk archive | Y | Y | Y | N | N | N |
| Bulk unarchive | Y | Y | Y | N | N | N |
| Bulk update status | Y | Y | N | N | N | N |

## 7) Suppression definitive

Permissions utilisees:

- `listings.delete.hard`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Supprimer definitivement une annonce | Y* | N | N | N | N | N |

Condition `Y*`:

- justification obligatoire
- confirmation forte (double validation UI)
- audit complet before/after
- interdit en bulk en MVP

## 8) Ecran Doublons (`/dashboard/listings/duplicates`)

Permissions utilisees:

- `listings.duplicates.read`
- `listings.duplicates.resolve`
- `listings.duplicates.recompute`

| Ecran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir clusters suspects | Y | Y | Y | N | Y | Y |
| Ouvrir detail cluster | Y | Y | Y | N | Y | Y |
| Voir score + raisons similarite | Y | Y | Y | N | Y | Y |
| Marquer "pas un doublon" | Y | Y | Y | N | Y* | N |
| Confirmer doublon | Y | Y | Y | N | N | N |
| Resoudre cluster (archivage cible) | Y | Y | Y | N | N | N |
| Recalculer detection doublons | Y | Y | N | N | N | N |

Condition `Y*`:

- `support_admin` peut seulement classer un cluster en "a revoir", pas "resolu definitif".

## 9) Dependances API (gate minimal)

Chaque route doit verifier la permission dediee:

- `GET /api/admin/v1/listings` -> `listings.read`
- `GET /api/admin/v1/listings/export` -> `listings.export`
- `GET /api/admin/v1/listings/{id}` -> `listings.read`
- `PATCH /api/admin/v1/listings/{id}` -> `listings.update`
- `PATCH /api/admin/v1/listings/{id}/status` -> `listings.status.update`
- `PATCH /api/admin/v1/listings/{id}/state` -> `listings.state.update`
- `POST /api/admin/v1/listings/bulk/archive` -> `listings.bulk.archive`
- `POST /api/admin/v1/listings/bulk/unarchive` -> `listings.bulk.unarchive`
- `DELETE /api/admin/v1/listings/{id}` -> `listings.delete.hard`
- `GET /api/admin/v1/listings/duplicates` -> `listings.duplicates.read`
- `POST /api/admin/v1/listings/duplicates/{clusterId}/resolve` -> `listings.duplicates.resolve`
- `POST /api/admin/v1/listings/duplicates/recompute` -> `listings.duplicates.recompute`

## 10) Audit log obligatoire

Mutations a auditer:

- edition annonce
- changement `status`
- changement `state`
- bulk archive/unarchive
- suppression definitive
- resolution de cluster doublon
- reclacul dedup

Champs minimaux d'audit:

- actorId
- actorRoles
- action
- resource (`property` / `listing_duplicate_cluster`)
- resourceId
- before snapshot
- after snapshot
- reason (si action sensible)
- correlationId
- timestamp

## 11) Regles UI a appliquer

- Deny by default.
- Si permission absente:
  - bouton masque ou desactive
  - tooltip explicite "Permission manquante"
- Les actions destructives doivent ouvrir un dialog de confirmation.
- Les actions critiques doivent exiger un motif libre.

## 12) Ecart actuel vs cible (a traiter pendant implementation)

Etat actuel observe (code):

- permissions listings existantes: `listings.read`, `listings.create`, `listings.approve`, `listings.reject`

Permissions a ajouter pour atteindre la cible:

- `listings.search`
- `listings.export`
- `listings.update`
- `listings.media.update`
- `listings.location.update`
- `listings.status.update`
- `listings.state.update`
- `listings.archive`
- `listings.unarchive`
- `listings.bulk.update`
- `listings.bulk.archive`
- `listings.bulk.unarchive`
- `listings.delete.hard`
- `listings.duplicates.read`
- `listings.duplicates.resolve`
- `listings.duplicates.recompute`

