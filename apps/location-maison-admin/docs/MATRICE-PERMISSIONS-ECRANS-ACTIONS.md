# Matrice Permissions Ultra Détaillée (Écran/Action)

## Objectif

Définir une matrice de permissions exploitable directement pour l'implémentation du dashboard admin.

## Rôles (MVP)

- `super_admin` (toi): accès total
- `operations_admin`
- `moderation_admin`
- `finance_admin`
- `support_admin`
- `analyst_admin` (lecture seule)

## Convention des clés de permission

Format: `<ressource>.<action>`

Exemples:

- `admins.read`
- `admins.invite`
- `admins.update_role`
- `users.read`
- `users.suspend`
- `listings.approve`
- `analytics.search_read`
- `analytics.traffic_read`
- `ads_analytics.read`
- `social_import.read`

## Règles globales d'autorisation

- Deny by default: toute action non explicitement autorisée est refusée.
- Contrôle côté API obligatoire pour chaque action sensible.
- Le contrôle UI (masquer/désactiver boutons) ne remplace pas le contrôle API.
- Toute action de mutation doit produire un audit log.

## Légende

- `Y`: autorisé
- `N`: non autorisé
- `Y*`: autorisé avec condition métier

## 1) Dashboard global

Permissions utilisées:

- `dashboard.read`
- `kpi.read`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir le dashboard global | Y | Y | Y | Y | Y | Y |
| Voir KPI utilisateurs/annonces/transactions | Y | Y | Y | Y | Y | Y |

## 2) Admins

Permissions utilisées:

- `admins.read`
- `admins.invite`
- `admins.update`
- `admins.suspend`
- `admins.revoke`
- `admins.view_presence`
- `admins.view_last_login`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Lister les admins | Y | Y | N | N | N | Y |
| Voir un admin (détail) | Y | Y | N | N | N | Y |
| Voir admins actuellement connectés | Y | Y | N | N | N | Y |
| Voir dernière connexion d'un admin | Y | Y | N | N | N | Y |
| Inviter un admin | Y | N | N | N | N | N |
| Suspendre un admin | Y | N | N | N | N | N |
| Retirer un admin | Y | N | N | N | N | N |

## 3) Rôles et permissions

Permissions utilisées:

- `roles.read`
- `roles.assign`
- `roles.update`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Lister les rôles | Y | Y | N | N | N | Y |
| Voir matrice des permissions | Y | Y | N | N | N | Y |
| Assigner un rôle à un admin | Y | N | N | N | N | N |
| Modifier permissions d'un rôle | Y | N | N | N | N | N |

## 4) Utilisateurs plateforme

Permissions utilisées:

- `users.read`
- `users.search`
- `users.update`
- `users.suspend`
- `users.reactivate`
- `users.view_presence`
- `users.view_last_seen`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Lister les utilisateurs | Y | Y | Y | Y | Y | Y |
| Rechercher un utilisateur | Y | Y | Y | Y | Y | Y |
| Voir un utilisateur (détail) | Y | Y | Y | Y | Y | Y |
| Voir utilisateurs en ligne | Y | Y | Y | Y | Y | Y |
| Voir dernière activité d'un utilisateur | Y | Y | Y | Y | Y | Y |
| Suspendre un utilisateur | Y | Y | N | N | Y* | N |
| Réactiver un utilisateur | Y | Y | N | N | Y* | N |

Condition `Y*` pour `support_admin`:

- Autorisé seulement sur comptes standards.
- Interdit sur comptes sensibles (annonceur vérifié premium, comptes litige finance, compte staff).

## 5) Annonceurs

Permissions utilisées:

- `announcers.read`
- `announcers.update`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Lister les annonceurs | Y | Y | Y | Y | Y | Y |
| Voir un annonceur (détail) | Y | Y | Y | Y | Y | Y |
| Mettre à jour infos annonceur | Y | Y | N | N | Y | N |

## 6) Modération annonces

Note:
- Pour le niveau de detail complet du module annonces (listing/detail/edition/etat/bulk/doublons), voir `./MATRICE-PERMISSIONS-ANNONCES-ECRANS-ACTIONS.md`.

Permissions utilisées:

- `listings.read`
- `listings.approve`
- `listings.reject`
- `listings.update`
- `listings.bulk_moderate`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Lister les annonces | Y | Y | Y | Y | Y | Y |
| Voir détail annonce | Y | Y | Y | Y | Y | Y |
| Approuver annonce | Y | Y | Y | N | N | N |
| Rejeter annonce | Y | Y | Y | N | N | N |
| Modifier statut modération | Y | Y | Y | N | N | N |
| Actions bulk modération | Y | Y | Y | N | N | N |

## 7) Crédits, transactions, remboursements

Permissions utilisées:

- `credits.read`
- `credits.grant`
- `credits.pack_manage`
- `transactions.read`
- `refunds.read`
- `refunds.create`
- `refunds.approve`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir packs crédits | Y | Y | N | Y | N | Y |
| Modifier packs crédits | Y | N | N | Y | N | N |
| Attribuer crédits manuellement | Y | N | N | Y | N | N |
| Voir transactions | Y | Y | N | Y | Y | Y |
| Initier remboursement | Y | N | N | Y | N | N |
| Valider remboursement | Y | N | N | Y* | N | N |

Condition `Y*` pour `finance_admin`:

- Au-delà d'un seuil défini (ex: montant élevé), double validation `super_admin` requise.

## 8) Analytics recherches

Permissions utilisées:

- `analytics.search_read` (actuel en code)
- `search_analytics.export` (extension cible)

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir tableau recherches (7 jours par défaut) | Y | Y | Y | Y | Y | Y |
| Filtrer période (7j, 30j, custom) | Y | Y | Y | Y | Y | Y |
| Voir taux résultat (avec/sans annonces) | Y | Y | Y | Y | Y | Y |
| Exporter les résultats | Y | Y | N | N | N | Y |

## 9) Analytics visites (Firebase + Vercel)

Permissions utilisées:

- `analytics.traffic_read` (actuel en code)
- `traffic_analytics.compare` (extension cible)
- `traffic_analytics.export` (extension cible)

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir métriques visites centralisées | Y | Y | Y | Y | Y | Y |
| Comparer Firebase vs Vercel | Y | Y | Y | Y | Y | Y |
| Exporter rapport visites | Y | Y | N | N | N | Y |

## 10) Analytics monétisation Ads (AdSense)

Note:
- Spécification fonctionnelle détaillée: `./MONETISATION-PUBS-ADSENSE-SPEC.md`.

Permissions utilisées:

- `ads_analytics.read` (cible)
- `ads_analytics.export` (cible)
- `ads_analytics.alerts.read` (cible)
- `ads_analytics.alerts.manage` (cible)

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir dashboard revenus pubs | Y | Y | N | Y | N | Y |
| Voir performance emplacements/pages | Y | Y | N | Y | N | Y |
| Voir alertes monétisation | Y | Y | N | Y | N | Y |
| Gérer seuils d'alertes monétisation | Y | Y | N | N | N | N |
| Exporter rapport monétisation | Y | Y | N | Y | N | Y |

## 11) Social Import (sourcing reseaux sociaux)

Note:
- Matrice detaillee complete: `./MATRICE-PERMISSIONS-SOCIAL-IMPORT-ECRANS-ACTIONS.md`.

Permissions utilisees:

- `social_import.read`
- `social_import.source.read`
- `social_import.source.update`
- `social_import.run.dry`
- `social_import.run.prod`
- `social_import.review`
- `social_import.publish`
- `social_import.reject`
- `social_import.export`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir les sources importables annonceur | Y | Y | Y | N | Y | Y |
| Modifier source importable (url/statut) | Y | Y | N | N | Y* | N |
| Lancer un dry-run import | Y | Y | Y | N | Y* | N |
| Lancer un run import production | Y | Y | N | N | N | N |
| Revoir annonces candidates importees | Y | Y | Y | N | Y | Y |
| Publier une annonce candidate | Y | Y | Y | N | N | N |
| Rejeter une annonce candidate | Y | Y | Y | N | Y* | N |
| Exporter rapport import/rejets | Y | Y | Y | N | N | Y |

Condition `Y*` pour `support_admin`:

- Dry-run uniquement, jamais de run production.
- Peut rejeter avec motif (support) mais ne peut pas publier.

## 12) Audit logs

Permissions utilisées:

- `audit_logs.read`
- `audit_logs.export`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Consulter audit logs | Y | Y | Y | Y | Y | Y |
| Exporter audit logs | Y | Y | N | N | N | Y |

## 13) Paramètres

Permissions utilisées:

- `settings.read`
- `settings.update`

| Écran / Action | super_admin | operations_admin | moderation_admin | finance_admin | support_admin | analyst_admin |
|---|---|---|---|---|---|---|
| Voir paramètres globaux | Y | Y | N | N | N | Y |
| Modifier paramètres globaux | Y | N | N | N | N | N |

## Règles d'implémentation prêtes à brancher

- Vérification API par permission clé, exemple: `requirePermission("users.suspend")`.
- Contrôle par écran: si absence de `*.read`, écran inaccessible.
- Contrôle par action: bouton masqué ou désactivé si permission absente.
- Audit log obligatoire pour `invite`, `suspend`, `revoke`, `approve`, `refund`, `update_role`, `settings.update`, `credits.grant`.
- Résolution en conflit: en cas de doute, refuser l'action et journaliser un event de refus.
