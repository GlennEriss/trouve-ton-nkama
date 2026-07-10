# Contexte actuel

## Le produit aujourd'hui

**Trouve Ton Nkama** est une plateforme immobilière en ligne au Gabon, déjà en production
(`www.tonnkama.com`), organisée en monorepo (`trouve-ton-nkama`, npm workspaces) depuis juillet
2026 — auparavant 3 repos GitHub séparés.

| App | Rôle | Statut |
|---|---|---|
| `apps/location-maison` | App publique : recherche/consultation d'annonces, publication (avec ou sans compte préalable), dashboard annonceur, notifications push | En prod |
| `apps/location-maison-admin` | Dashboard interne : modération d'annonces, gestion utilisateurs, finance/crédits, publicité, analytics, import social (Facebook/Apify) | En prod |
| `apps/marketing` | Scripts de génération de vidéos promotionnelles (Playwright), sauvegardés sur Google Drive | Usage ponctuel |

## Infrastructure existante à connaître avant de spécifier de nouvelles fonctionnalités

Ce qui suit est déjà construit et **doit être réutilisé, pas réinventé**, quand on conçoit les
prochaines fonctionnalités :

- **Modération** : chaque annonce a un `moderationStatus` (`PENDING`/`APPROVED`/`REJECTED`),
  workflow admin avec motif de rejet, notification (in-app + push) à l'annonceur. Pattern
  réutilisable pour tout contenu généré par les utilisateurs (ex: futurs Réels).
- **Notifications** : système in-app (Firestore, écoute temps réel) + push (FCM, service worker
  dédié, opt-in) déjà en place, déclenché depuis les Cloud Functions.
- **Paiement / crédits** : intégrations **MyPayGa** et **Airtel Money** déjà fonctionnelles
  (`functions/src/payments/`), un système de crédits (`credits` sur `User`, `credit_transactions`,
  `credit_packs` gérés côté admin). C'est la fondation à étendre pour tout nouveau flux d'argent
  (cadeaux, abonnements) plutôt que d'intégrer un nouveau prestataire de paiement from scratch.
- **Cache** : abstraction Strategy (`CacheStore`) Redis/Firestore déjà en place côté
  `location-maison`, mais pas encore utilisée partout où elle devrait l'être (voir
  [Refactoring & coûts](./refactoring-optimisation-couts.md)).
- **Recherche** : Algolia synchronisé depuis Firestore via extension Firebase.
- **Design patterns déjà adoptés** : Strategy/Factory/Director pour le formulaire de publication
  multi-type de bien (`src/builders/property-form/`, `src/factories/property-form/`,
  `src/directors/`) — pattern à répliquer ailleurs plutôt qu'à réinventer (voir même document).
- **`packages/core`** (monorepo) : premier socle de code partagé entre les deux apps
  (constantes Firestore, énums, utilitaires de formatage) — à faire grandir au fur et à mesure.

## Documentation détaillée

- [`docs/location-maison/`](./location-maison/) — documentation technique complète de l'app
  publique (auth, formulaire d'annonce, IA de recherche, tracking, SEO, etc.)
- [`docs/location-maison-admin/`](./location-maison-admin/) — documentation technique complète
  du dashboard admin (architecture, RBAC, modération, finance, analytics)

## Documents de ce dossier

- [01-vision.md](./01-vision.md) — où va le produit
- [reels-cadeaux-abonnement.md](./reels-cadeaux-abonnement.md) — analyse : section Réels + cadeaux + abonnement annonceur
- [recherche-annonces-inversee.md](./recherche-annonces-inversee.md) — analyse : zone "je recherche" (annonces inversées)
- [refactoring-optimisation-couts.md](./refactoring-optimisation-couts.md) — analyse : refactoring ciblé + optimisation coûts Firebase/GCP
- [10-roadmap.md](./10-roadmap.md) — ordre de priorité
