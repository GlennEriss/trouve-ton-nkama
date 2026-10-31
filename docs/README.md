# Documentation Trouve Ton Nkama

## Point d'entrée développeur

| Domaine | Documentation principale | Statut |
|---|---|---|
| Contexte produit | [Contexte actuel](./00-contexte-actuel.md) | Référence |
| Vision globale | [Vision](./01-vision.md) | Référence |
| Roadmap | [Roadmap](./10-roadmap.md) | Évolutif |
| Recherche indépendante d'Algolia | [Backlog NexaSearch SDK et moteur](./nexasearch-backlog.md) | ⬜ À faire — chantier long terme, Algolia conservé pendant la transition |
| Migration backend commun | [Suivi NestJS, gateway et Firebase](./10-roadmap.md#chantier-transversal--migration-vers-un-backend-commun-à-planifier) | ⬜ À faire — audit et migration progressive à planifier |
| Marketplace multi-catégories | [Index marketplace](./marketplace-multi-categories/README.md) | Architecture produit |
| Recommandation Machine Learning | [Index ML](./recommendation-ml/README.md) | Prêt pour arbitrages pré-implémentation |
| Publicité et revenus AdSense | [Index Publicité](./location-maison/feature/publicite/README.md) | Audit et architecture monétisation |
| Publication sociale | [Index publication sociale](./location-maison/feature/publication-sociale/README.md) | Facebook existant, Threads spécifié |
| Complexité algorithmique | [Index performance](./location-maison/performance/README.md) | Audit intégral et guide développeur des correctifs |
| Performance des publications | [Audit annonces et réels](./performance-creation-modification-annonces-reels.md) | Analyse technique |
| Administration | [Documentation admin](./location-maison-admin/README.md) | Référence admin |
| Annonces rapides | [Dossier développeur](./annonces-rapides/README.md) | Architecture et paiement 200 FCFA ; arbitrages métier ouverts |

Pour travailler sur le système de recommandation, commencer exclusivement par
[docs/recommendation-ml/README.md](./recommendation-ml/README.md). Ce document donne l'ordre de
lecture, le statut des décisions et les gates précédant le code.
