# MVP v1 Figé - Dashboard Admin Trouve Ton Nkama

## Date de gel

- Date: 2026-05-03
- Version: `MVP v1`
- Statut: figé pour implémentation

## Objectif v1

Livrer un back-office admin sécurisé permettant la gestion opérationnelle de base, la modération, la finance essentielle et la centralisation analytics clés.

## Périmètre IN (v1)

## 1. Auth et sécurité admin

- Authentification admin
- Session management
- RBAC appliqué sur routes/écrans/actions critiques
- Audit log des actions sensibles

## 2. Gestion admins

- Lister les admins
- Inviter un admin
- Activer/suspendre/retirer un admin
- Voir admins en ligne
- Voir dernière connexion des admins hors ligne

## 3. Rôles admin (prédéfinis)

- `super_admin` (toi)
- `operations_admin`
- `moderation_admin`
- `finance_admin`
- `support_admin`
- `analyst_admin`

## 4. Gestion utilisateurs et annonceurs

- Lister/rechercher utilisateurs
- Voir utilisateur en ligne / dernière activité
- Suspendre/réactiver utilisateur (selon permissions)
- Lister et consulter annonceurs

## 5. Modération annonces

- File de modération
- Approuver/rejeter avec motif
- Historique des décisions
- Actions bulk de base

## 6. Crédits, transactions, remboursements (essentiel)

- Lire/mettre à jour packs crédits (rôles autorisés)
- Attribution manuelle de crédits
- Consultation transactions
- Workflow remboursement MVP

## 7. Analytics recherches (core)

- Affichage par défaut des 7 derniers jours
- Sources:
- `https://www.tonnkama.com/search`
- barre de recherche `location-maison`
- KPI minimum:
- volume de recherches
- top recherches
- types de logement recherchés
- fourchettes de prix recherchées
- avec résultats vs sans résultats

## 8. Analytics visites centralisées

- Intégration des indicateurs Firebase Analytics
- Intégration des indicateurs Vercel Analytics
- Vue comparative simple sur même période

## Périmètre OUT (v1)

- Rôles personnalisables (custom RBAC)
- Permissions temporaires avancées
- Scopes géographiques complexes par rôle
- BI avancée multi-source hors Firebase/Vercel
- Automatisations IA support/modération
- Refonte front public `location-maison`

## Critères d'acceptation release v1

- 100% des actions sensibles protégées RBAC côté API.
- 100% des actions sensibles tracées en audit log.
- Listing admins/utilisateurs avec présence opérationnel.
- Analytics recherches 7 jours opérationnel.
- Comparatif Firebase/Vercel opérationnel.
- Rôles prédéfinis testés sur un jeu de scénarios critiques.

## Scénarios critiques à valider avant release

- `super_admin` invite un nouvel admin puis assigne un rôle.
- `moderation_admin` modère une annonce sans accès finance.
- `finance_admin` gère crédit/remboursement sans accès rôles.
- `analyst_admin` lit analytics sans droits de mutation.
- Un utilisateur hors ligne affiche correctement `last_seen_at`.
- Une recherche apparaît dans les stats 7 jours avec indicateur résultat.

## Dépendances externes v1

- Accès aux données recherche depuis:
- catalogue `https://www.tonnkama.com/search`
- barre de recherche `location-maison`
- Accès aux données Firebase Analytics
- Accès aux données Vercel Analytics

## Risques v1 et mitigations

- Risque: divergence métriques Firebase vs Vercel.
- Mitigation: afficher la source et la méthode de calcul par KPI.

- Risque: faux positifs sur présence en ligne.
- Mitigation: seuil heartbeat explicite et affiché dans la doc produit.

- Risque: permissions mal configurées.
- Mitigation: deny by default + tests de scénarios par rôle.

## Gouvernance de changement après gel

- Toute demande hors périmètre v1 passe en backlog `v1.x` ou `v2`.
- Aucun élargissement de scope sans validation explicite.
- Les clarifications fonctionnelles sont autorisées sans casser le périmètre figé.
