# RBAC - Rôles et Permissions

## Objectif

Mettre en place un contrôle d'accès robuste pour que chaque admin ne puisse exécuter que les actions autorisées.

## Concepts

- `Role`: ensemble de permissions
- `Permission`: action autorisée sur une ressource
- `Resource`: module métier (users, listings, credits, etc.)
- `Action`: read, create, update, delete, approve, reject, invite, suspend, reactivate, export, manage

## Rôles proposés (MVP)

1. `super_admin` (toi)
- Accès total sur tous les modules
- Peut inviter/suspendre/supprimer des admins
- Peut attribuer/changer les rôles
- Peut gérer les paramètres critiques
- Compte principal de gouvernance du dashboard (MVP: 1 super_admin initial)

2. `operations_admin`
- Gère les opérations quotidiennes du back-office
- Peut traiter utilisateurs/annonceurs/annonces selon permissions
- Ne peut pas modifier les règles RBAC globales

3. `moderation_admin`
- Modère les annonces et contenus
- Peut approuver/rejeter avec motif
- N'a pas accès aux modules financiers

4. `finance_admin`
- Gère crédits, transactions et remboursements
- N'a pas accès à la gestion des rôles admin

5. `support_admin`
- Gère le support utilisateur/annonceur
- Peut lire largement et exécuter des actions de support limitées

6. `analyst_admin`
- Lecture seule sur dashboards, recherches, visites et logs
- Aucune action de mutation

## Matrice de permissions (MVP)

Ressources principales:

- `admins`
- `roles`
- `users`
- `announcers`
- `listings`
- `credits`
- `transactions`
- `refunds`
- `analytics` (search + traffic)
- `ads_analytics` (monetisation)
- `social_import` (sourcing + import annonces reseaux)
- `settings`
- `audit_logs`

Actions:

- `read`
- `create`
- `update`
- `delete`
- `approve`
- `reject`
- `invite`
- `suspend`
- `reactivate`
- `view_presence`
- `view_last_login`
- `view_last_seen`
- `export`
- `compare`
- `manage`

Nomenclature alignée:

- Format standard: `resource.action`
- Analytics (actuel en code): `analytics.search_read`, `analytics.traffic_read`
- Ads analytics (cible documentée): `ads_analytics.read`, `ads_analytics.export`, `ads_analytics.alerts.read`, `ads_analytics.alerts.manage`
- Social import (cible documentee): `social_import.*`
- References: `./MATRICE-PERMISSIONS-ECRANS-ACTIONS.md`, `./MATRICE-PERMISSIONS-SOCIAL-IMPORT-ECRANS-ACTIONS.md`, `./architecture/CHECKLIST-IMPLEMENTATION-RBAC-SOCIAL-IMPORT.md` et `./MONETISATION-PUBS-ADSENSE-SPEC.md`

Règles globales:

- `super_admin`: toutes permissions
- `operations_admin`: lecture/édition opérationnelle, sans gestion `roles`/`settings` critiques
- `moderation_admin`: permissions centrées `listings` (`read`, `approve`, `reject`) + lecture contexte utilisateur
- `finance_admin`: permissions centrées `credits`, `transactions`, `refunds`
- `support_admin`: `users`/`announcers` lecture + actions support limitées
- `analyst_admin`: permissions `read` et visualisation analytics seulement

## Matrice explicite par rôle (résumé)

- `super_admin`:
- Actuel en code: `*.*`
- Cible ads analytics: toutes permissions `ads_analytics.*`

- `operations_admin`:
- Actuel en code: `admins.read`, `admins.view_presence`, `admins.view_last_login`, `users.read|search|create|update|suspend|reactivate|view_presence|view_last_seen`, `announcers.create|update`, `listings.read|create|approve|reject`, `transactions.read`, `analytics.search_read`, `analytics.traffic_read`, `audit_logs.read`
- Cible ads analytics: `ads_analytics.read`, `ads_analytics.export`, `ads_analytics.alerts.read`, `ads_analytics.alerts.manage`

- `moderation_admin`:
- Actuel en code: `users.read|search|view_presence|view_last_seen`, `announcers.read`, `listings.read|approve|reject`, `audit_logs.read`
- Cible ads analytics: aucun accès

- `finance_admin`:
- Actuel en code: `users.read|search|view_presence|view_last_seen`, `credits.read|grant`, `transactions.read`, `refunds.read|approve`, `analytics.traffic_read`, `audit_logs.read`
- Cible ads analytics: `ads_analytics.read`, `ads_analytics.export`, `ads_analytics.alerts.read`

- `support_admin`:
- Actuel en code: `users.read|search|create|suspend|reactivate|view_presence|view_last_seen`, `announcers.read|create|update`, `listings.create`, `transactions.read`, `analytics.search_read`, `analytics.traffic_read`, `audit_logs.read`
- Cible ads analytics: aucun accès

- `analyst_admin`:
- Actuel en code: `admins.read|view_presence|view_last_login`, `users.read|search|view_presence|view_last_seen`, `transactions.read`, `analytics.search_read`, `analytics.traffic_read`, `audit_logs.read`
- Cible ads analytics: `ads_analytics.read`, `ads_analytics.export`, `ads_analytics.alerts.read`

## Règles de sécurité obligatoires

- Contrôle permission côté API (jamais seulement côté UI)
- Double validation pour actions sensibles (ex: remboursement élevé)
- Audit log obligatoire pour:
- connexion/déconnexion admin
- lecture des données sensibles
- changement de rôle
- suspension d'utilisateur
- attribution de crédits
- remboursements
- changements de paramètres
- Mise à jour de présence:
- Admin `online` si session active
- Admin `offline` sinon, avec `last_login_at` affiché
- Utilisateur `online` si activité récente (fenêtre à définir)
- Utilisateur `offline` sinon, avec `last_seen_at`

## Workflow invitation admin

1. Un admin autorisé envoie une invitation
2. L'invitation porte un rôle initial
3. Le destinataire accepte l'invitation
4. Le compte admin est activé avec permissions du rôle
5. Toute modification ultérieure de rôle est auditée

## Évolution phase 2

- Rôles personnalisés par combinaison de permissions
- Scopes par pays/région
- Permissions temporaires (durée limitée)
