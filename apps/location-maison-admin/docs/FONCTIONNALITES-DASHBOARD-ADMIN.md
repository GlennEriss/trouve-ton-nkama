# Fonctionnalités Dashboard Admin

## 1. Authentification et sécurité admin

- Connexion admin sécurisée
- MFA (optionnel en MVP, recommandé)
- Gestion de session et expiration
- Journalisation des tentatives échouées
- Suivi de présence admin:
- Voir les admins actuellement connectés
- Voir la dernière connexion (`last_login_at`) des admins hors ligne
- Voir la dernière activité (`last_seen_at`) pour distinguer connecté vs inactif

## 2. Gestion des admins

- Lister tous les admins
- Inviter un admin par email
- Affecter un rôle à l'invitation
- Activer, suspendre, retirer un admin
- Voir historique des invitations
- Voir statut de session de chaque admin:
- `online` (connecté maintenant)
- `offline` + date/heure de dernière connexion

## 3. RBAC (RDBC demandé)

- Permissions par module et par action
- Rôles prédéfinis explicites (MVP):
- `super_admin` (toi): accès total
- `operations_admin`
- `moderation_admin`
- `finance_admin`
- `support_admin`
- `analyst_admin` (lecture seule)
- Contrôles UI + API basés permissions
- Blocage strict des actions non autorisées
- Rôles personnalisables (phase 2)

## 4. Gestion utilisateurs plateforme

- Lister tous les utilisateurs
- Rechercher un utilisateur
- Consulter profil, statut et activité
- Voir les utilisateurs actuellement en ligne
- Voir la dernière présence (`last_seen_at`) des utilisateurs hors ligne
- Suspendre/réactiver un compte
- Réinitialiser certains états métier (avec audit)

## 5. Gestion annonceurs

- Lister les annonceurs
- Vérifier les statuts et informations clés
- Actions de support annonceur
- Reseaux sociaux annonceur:
- Lecture des liens/handles sociaux depuis la fiche annonceur
- Edition admin des liens/handles (permission `announcers.update`)
- Ouverture directe des liens en nouvel onglet (mode consultation)
- Preparation des sources importables pour pipeline reseaux sociaux

## 6. Annonces Admin (module `listing-moderation`)

Alignement architecture actuelle:

- Le module technique est `listing-moderation` (pas de module separe `listing-management` en MVP).
- Ce module couvre a la fois moderation et operations annonces admin.

Fonctionnalites moderation (coeur MVP):

- File de modération (en attente, validée, rejetée)
- Validation/rejet avec motif
- Historique des décisions
- Actions en lot (bulk approve/reject)

Fonctionnalites operations annonces admin (dans le meme module):

- Listing annonces (pagination, filtres, recherche)
- Edition annonce
- Changement d'etat/statut
- Centre de doublons d'annonces (detecter, comparer, resoudre)

Reference detaillee:

- `./GESTION-ANNONCES-ADMIN-SPEC.md`
- `./MATRICE-PERMISSIONS-ANNONCES-ECRANS-ACTIONS.md`

## 7. Crédits, transactions et remboursements

- Gestion des packs de crédits
- Attribution manuelle de crédits
- Consultation des transactions globales
- Workflow de remboursement

## 8. Support opérationnel

- Vue incidents/tickets (intégration future)
- Journal des actions admin par entité
- Recherche globale (utilisateur, annonce, transaction)

## 9. Statistiques admin (module `analytics-insights`)

- Vue synthèse: utilisateurs, annonces, transactions
- KPI journaliers/hebdomadaires
- Suivi des actions de modération
- Statistiques de présence:
- Admins en ligne maintenant
- Utilisateurs en ligne maintenant
- Dernières connexions/dernières activités
- Analytics de recherches (par défaut: 7 derniers jours):
- Source `https://www.tonnkama.com/search`
- Source barre de recherche du projet `location-maison`
- Volume de recherches, mots-clés, fourchettes de prix, types de logement
- Indicateur de résultat: recherche avec résultats vs sans résultat
- Export et filtres par période (7j par défaut, 30j, personnalisé)
- Centralisation analytics visites plateforme:
- Importer/afficher les indicateurs Firebase Analytics
- Importer/afficher les indicateurs Vercel Analytics
- Comparatif rapide Firebase vs Vercel sur une même période
- Objectif: ne plus ouvrir séparément Firebase/Vercel pour lire les stats
- Sous-module monétisation ads admin (dans `analytics-insights`):

- Suivre revenus journaliers/hebdomadaires/mensuels (dont MTD)
- Suivre RPM, CTR, fill rate, viewability
- Identifier pages et emplacements pub sous-performants
- Comparer revenu pub vs trafic réel pour mesurer la rentabilité
- Déclencher des alertes en cas de chute brutale des revenus
- Spécification détaillée: `./MONETISATION-PUBS-ADSENSE-SPEC.md`

## 10. Paramétrage plateforme

- Paramètres globaux administrables
- Configuration des règles métier sensibles
- Feature flags (phase 2)

## 10.1 Sourcing annonces reseaux sociaux

- Gouverner les sources annonceur autorisees (statut actif/pause/revoque)
- Suivre les imports mensuels des annonces depuis reseaux sociaux
- Superviser les erreurs/rejets et valider les publications
- Reference architecture operationnelle complete:
- `./architecture/ARCHITECTURE-OPERATIONNELLE-IMPORT-ANNONCES-RESEAUX-SOCIAUX.md`

## Priorisation MVP

Priorité P0:
- Auth admin
- Invitation admins
- RBAC de base
- Listing admins + statut en ligne/dernière connexion
- Listing utilisateurs + statut en ligne/dernière activité
- Modération annonces
- Gestion crédits/transactions (lecture + actions essentielles)
- Audit log admin
- Analytics recherches 7 jours (avec indicateur résultat)
- Centralisation des visites Firebase/Vercel
- Suivi revenus pubs AdSense (vue synthèse business)

Priorité P1:
- Remboursements avancés
- Statistiques détaillées
- Actions bulk avancées
- Performance détaillée par emplacement pub (slot-level)

Priorité P2:
- Rôles personnalisables
- Automatisations avancées
- Intégrations support externes

## 11. Alignement architecture actuelle (annonce + ads)

### 11.1 Annonce Admin

- Module: `src/modules/listing-moderation`
- Prefixe API: `/api/admin/v1/listings/*`
- RBAC actuel en code: `listings.read`, `listings.create`, `listings.approve`, `listings.reject`
- Extension documentee (prochaine etape): permissions lifecycle/detail/bulk/doublons dans `./MATRICE-PERMISSIONS-ANNONCES-ECRANS-ACTIONS.md`

### 11.2 Ads Admin (monetisation)

- Module: `src/modules/analytics-insights` (sous-capacite monetisation)
- Prefixe API cible: `/api/admin/v1/analytics/ads/*`
- RBAC analytics actuel en code: `analytics.search_read`, `analytics.traffic_read`
- RBAC ads cible (a ajouter): `ads_analytics.read`, `ads_analytics.export`, `ads_analytics.alerts.read`, `ads_analytics.alerts.manage`

### 11.3 Regle de coherence architecture

- Les ecrans admin doivent refléter les modules techniques existants.
- Les nouvelles capacites annonces et ads restent dans les modules actuels pour eviter une fragmentation prematuree.
- Toute nouvelle permission doit etre ajoutee dans `iam` avant exposition UI/API.
