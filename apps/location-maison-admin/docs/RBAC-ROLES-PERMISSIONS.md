# RBAC - Rôles et Permissions

## Objectif

Mettre en place un contrôle d'accès robuste pour que chaque admin ne puisse exécuter que les actions autorisées.

## Concepts

- `Role`: ensemble de permissions
- `Permission`: action autorisée sur une ressource
- `Resource`: module métier (users, listings, credits, etc.)
- `Action`: read, create, update, delete, approve, refund, invite

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
- `admin_sessions`
- `roles`
- `users`
- `user_presence`
- `announcers`
- `listings`
- `credits`
- `transactions`
- `refunds`
- `search_analytics`
- `traffic_analytics`
- `settings`
- `audit_logs`

Actions:

- `read`
- `create`
- `update`
- `delete`
- `approve`
- `refund`
- `invite`
- `assign_role`
- `revoke_access`
- `view_presence`
- `view_search_analytics`
- `view_traffic_analytics`

Règles globales:

- `super_admin`: toutes permissions
- `operations_admin`: lecture/édition opérationnelle, sans gestion `roles`/`settings` critiques
- `moderation_admin`: permissions centrées `listings` (`read`, `approve`, `update`) + lecture contexte utilisateur
- `finance_admin`: permissions centrées `credits`, `transactions`, `refunds`
- `support_admin`: `users`/`announcers` lecture + actions support limitées
- `analyst_admin`: permissions `read` et visualisation analytics seulement

## Matrice explicite par rôle (résumé)

- `super_admin`:
- `admins:*`, `roles:*`, `users:*`, `announcers:*`, `listings:*`, `credits:*`, `transactions:*`, `refunds:*`, `search_analytics:read`, `traffic_analytics:read`, `settings:*`, `audit_logs:read`

- `operations_admin`:
- `admins:read`, `admin_sessions:read`, `users:read|update`, `user_presence:read`, `announcers:read|update`, `listings:read|update`, `transactions:read`, `search_analytics:read`, `traffic_analytics:read`, `audit_logs:read`

- `moderation_admin`:
- `users:read`, `announcers:read`, `listings:read|approve|update`, `search_analytics:read`, `audit_logs:read`

- `finance_admin`:
- `users:read`, `credits:read|update`, `transactions:read|create`, `refunds:read|create|approve`, `traffic_analytics:read`, `audit_logs:read`

- `support_admin`:
- `users:read|update`, `user_presence:read`, `announcers:read|update`, `listings:read`, `transactions:read`, `audit_logs:read`

- `analyst_admin`:
- `admins:read`, `admin_sessions:read`, `users:read`, `user_presence:read`, `listings:read`, `transactions:read`, `search_analytics:read`, `traffic_analytics:read`, `audit_logs:read`

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
