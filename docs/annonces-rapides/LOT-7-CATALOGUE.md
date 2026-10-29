# Lot 7 — accueil et catalogue

28 octobre 2026. Implémentation locale, sans commit ni déploiement applicatif.

## Parcours livré

- Accueil mobile/desktop : `QuickListingsFeed preview` après les demandes de recherche, avant les catégories ; quatre offres au maximum, Voir tout vers `/search?category=Rapides`.
- Catalogue : pastille Rapides après Demandes. Liste indépendante des résultats classiques, sans filtres de prix/surface/type ni recherche textuelle non prise en charge. La sélection Rapides retire les anciens paramètres de recherche.
- Accès autonome `/annonces-rapides`, mêmes cartes et avertissements. Carte → fiche existante `/annonces-rapides/[id]`.
- États chargement, vide, erreur/reprise et bouton Afficher plus. Le guide UI/UX a guidé le réemploi des styles et l'accessibilité des états.

## Données et sécurité

`GET /api/quick-listings` : limite par défaut 20, plage 1–50, curseur base64url validé (timestamp secondes/nanosecondes + ID). Réponse no-store, projection explicite des champs publics. Erreur interne générique 503 sans fuite de détails.

`listPublicQuickListings` : WHERE confirmed + APPROVED + IN_PROGRESS, ORDER BY publishedAt DESC / identifiant DESC, lecture limite + 1. Aucun scan intégral ni offset. Les documents mal formés sont écartés dans cette page bornée ; le curseur avance quand même. Cache client 30 secondes, pas de cache serveur persistant.

Index versionné dans `apps/location-maison/firestore.indexes.json`. **Seul cet index a été créé dans `location-maison-dev`**, état READY confirmé : `CICAgLjRnZMK`. Aucun index ni règle prod modifié. Lors du futur déploiement prod, préparer cet index et attendre READY avant ouverture du module.

## Fichiers principaux

- `src/components/quick-listings/QuickListingsFeed.tsx`
- `src/features/quick-listings/public-listing.server.ts`
- `src/app/api/quick-listings/route.ts`
- `src/app/(public)/annonces-rapides/page.tsx`
- Les deux variantes HomePage, SearchMobilePage/SearchDesktopPage et CategoryFilterPills.

## Vérifications

- 8 suites ciblées : 48 tests distincts réussis (7 suites/45 tests, puis suite données/3 tests ; suite mobile réexécutée après ajustement).
- TypeScript sans erreur, `git diff --check` propre.
- Lecture réelle dev : API retourne les deux fixtures sans champs privés.
- Navigateur Chromium : aperçu accueil contrôlé à 390 et 1440 px ; catalogue mobile contrôlé ; parcours Voir tout → Rapides → fiche réussi, sans écriture ni paiement.
- Captures locales examinées : `/tmp/nkama-home-quick-390.png`, `/tmp/nkama-home-quick-1440.png`, `/tmp/nkama-quick-mobile.png`. Pas de validation exhaustive thème sombre/iOS/Android natifs.

Le formulaire de création et le paiement ne sont pas encore implémentés (lots 8 et 9). Les deux fixtures restent disponibles pour les tests manuels ; aucun nouveau document créé dans ce lot. La vérification réelle de partage WhatsApp/Facebook du lot 6 reste à faire.
