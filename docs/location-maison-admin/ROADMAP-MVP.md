# Roadmap MVP - Dashboard Admin

## Phase 0 - Cadrage

- Valider périmètre MVP
- Valider matrice RBAC initiale
- Définir les actions sensibles à auditer

## Phase 1 - Fondations sécurité

- Auth admin
- Modèle RBAC (rôles prédéfinis)
- Middleware/API guard de permissions
- Audit log minimal

## Phase 2 - Opérations cœur

- Gestion admins (invitation + activation + suspension)
- Listing admins + statut connecté + dernière connexion
- Modération annonces
- Gestion utilisateurs / annonceurs
- Listing utilisateurs + statut en ligne + dernière activité

## Phase 3 - Finance opérationnelle

- Packs crédits
- Transactions globales
- Attributions manuelles
- Workflow remboursements

## Phase 4 - Pilotage

- Dashboard KPI global
- Rapports opérationnels clés
- Analytics recherches:
- Période par défaut 7 derniers jours
- Sources `https://www.tonnkama.com/search` + barre de recherche `location-maison`
- Indicateur résultat: avec annonces / sans annonces
- Analytics visites centralisées:
- Données Firebase Analytics
- Données Vercel Analytics
- Comparatif Firebase vs Vercel sur même période
- Optimisation UX des workflows quotidiens

## Critères de sortie MVP

- RBAC appliqué sur 100% des routes admin critiques
- Toutes les actions sensibles tracées
- Flux invitation admin opérationnel
- Flux modération et flux crédits utilisables en production
- Vue centralisée des recherches 7 jours disponible
- Vue centralisée des visites Firebase/Vercel disponible
