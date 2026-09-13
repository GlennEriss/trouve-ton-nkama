# Implémentation des correctifs de complexité — septembre 2026

Document de suivi lié au
[guide développeur](./GUIDE-DEVELOPPEUR-CORRECTIFS-COMPLEXITE.md).

## Correctifs livrés dans le code

| Zone | Correctif | Effet |
|---|---|---|
| Annonces publiques | `getProperties` lit `K + 1` documents en une requête et borne `K` à 50 | suppression de la requête de contrôle `limit(1)` |
| Favoris | `getPropertiesByIds` déduplique, découpe en lots Firestore `in` de 30 et utilise au plus 3 workers | latence non proportionnelle à un RTT par favori |
| UI favoris | remplacement de l'usage artificiel de `useInfiniteQuery` par `useQuery` sur la page courante | état et cache simplifiés, ordre conservé |
| API réels | validation de `limitPerPage` entre 1 et 50 | empêche une lecture arbitrairement grande |
| DB réels | `getPublicReels` et `getReelsByOwner` lisent `K + 1`, bornent la limite et détectent exactement `hasMore` | plus de fausse page suivante sur une dernière page pleine |
| Notifications | traitement avec 10 workers au maximum ; séquence interne de chaque destinataire conservée | réduit `U × RTT` sans `Promise.all` illimité |
| Géographie | comparaison de proximité limitée aux quartiers de même nom normalisé | évite le scan de tous les quartiers déjà retenus |
| Sélecteurs géographiques | index `Set` pour l'appartenance ville/quartier, un seul tri par liste et aucune mutation du cache partagé | remplace le parcours quadratique et les tris successifs par `O(V + Q)` puis `O(N log N)` une seule fois |
| Carte | ajout de `truncated` lorsque la fenêtre atteint 200 annonces | contrat explicite sur le caractère non exhaustif du total |
| Pagination React | caches de pages et curseurs dans des `Map` stables, invalidés au changement des filtres | supprime les mutations pendant le rendu et les curseurs dupliqués |
| Propriété d'annonce | double écriture de `ownerUids` dans les créations app/admin et les deux parcours de revendication | prépare une requête propriétaire unique sans casser les lectures historiques |
| « Mes annonces » | lecture unique `ownerUids array-contains` derrière `ANNOUNCER_ADS_OWNER_UIDS_QUERY=true`, avec ancien chemin conservé | passe de deux requêtes et fusion à une requête, avec rollback immédiat par variable d'environnement |

## Tests ajoutés ou adaptés

- `__tests__/db/property.db.test.ts` : une seule lecture `K+1`, borne DB, lots favoris et ordre ;
- `__tests__/db/reel.db.test.ts` : `K+1`, page pleine terminale et borne de lecture ;
- `__tests__/api/reels-feed.test.ts` : limites zéro, invalide et excessive ;
- `__tests__/api/map-properties.test.ts` : indicateur de troncature ;
- `__tests__/hooks/use-properties-pagination.test.ts` : navigation, cache et invalidation des filtres ;
- `functions/__tests__/async/for-each-with-concurrency.test.ts` : exhaustivité et plafond de concurrence ;
- les tests OSM existants couvrent toujours doublons proches et homonymes éloignés.

Validation exécutée :

- `npm run check:types` dans `apps/location-maison` : succès ;
- `npx tsc --noEmit` dans `apps/location-maison-admin` : succès ;
- `npm run build` dans `apps/location-maison/functions` : succès ;
- 6 suites ciblées, 74 tests : succès.

La suite Functions complète exécute 175 tests avec succès dans 18 suites. Deux suites email ne
démarrent pas dans le bac à sable à cause de `buffer-equal-constant-time`/Firebase Admin au moment
de l'import ; cette panne d'environnement préexistante ne touche pas les correctifs de complexité.

## Correctifs volontairement non activés sans migration

### « Mes annonces »

Le scan complet de `app/api/announcer/ads/route.ts` reste le principal P0. Le remplacer exige :

1. ~~ajout et double écriture de `ownerUids` dans les producteurs app/admin et les revendications~~ : livré ;
2. ~~backfill vérifiable des documents existants~~ : 1 035/1 035 documents corrigés en production le 13 septembre 2026, second dry-run à zéro ;
3. index composites : aucun index composite requis pour la première bascule `array-contains` sans tri serveur ;
4. stratégie séparée pour recherche texte et agrégats ;
5. lecture miroir et feature flag.

Le script `apps/location-maison-admin/scripts/listings/backfill-owner-uids.ts` est paginé,
idempotent et fonctionne en dry-run par défaut. Commandes :

- `npm run listings:backfill-owners:dry` pour mesurer sans écrire ;
- `npm run listings:backfill-owners:apply` uniquement après validation du dry-run et sauvegarde.

Le backfill de production a été vérifié immédiatement après écriture : 1 035 annonces parcourues,
zéro correction restante et zéro annonce sans propriétaire exploitable. La nouvelle requête est
implémentée, mais reste inactive tant que la version du code qui assure la double écriture n'est
pas déployée. Après déploiement, activer `ANNOUNCER_ADS_OWNER_UIDS_QUERY=true`; revenir à `false`
constitue le rollback sans migration inverse.

### Expiration des promotions

La requête ciblée sur `currentPromotion.endDate` ne retourne pas les anciennes données malformées
où cette date est absente, alors que la policy actuelle les nettoie. Le scan complet est conservé
jusqu'à un backfill vérifié ; privilégier la correction métier à une optimisation qui laisserait
des promotions actives indéfiniment.

### Virtualisation des listes

Elle n'est pas activée sans mesure mémoire/DOM, car elle peut modifier scroll, focus, tracking et
impressions publicitaires. Les lectures sont déjà paginées ; ce lot doit être déclenché par un
budget navigateur réellement dépassé.

## Prochaine étape recommandée

Déployer d'abord la double écriture, relancer le dry-run afin de couvrir les annonces éventuellement
créées entre-temps, puis activer `ANNOUNCER_ADS_OWNER_UIDS_QUERY=true`. La recherche texte, les tris
et les agrégats de « Mes annonces » devront ensuite être séparés de la lecture paginée (ou servis
par Algolia avec filtrage obligatoire sur le propriétaire) pour supprimer le dernier scan par
annonceur.
