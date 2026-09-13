# Guide développeur — correctifs de complexité algorithmique

Date : 13 septembre 2026  
Document parent : [audit intégral](./AUDIT-COMPLEXITE-ALGORITHMIQUE-2026-09.md)  
Objet : indiquer précisément **où intervenir, pourquoi, comment et avec quels tests**.

## 1. Comment utiliser ce guide

Ne pas ouvrir tous les fichiers à la fois. Pour chaque lot :

1. lire la fiche du lot ;
2. exécuter les tests existants indiqués ;
3. ajouter les tests de coût ou de contrat manquants ;
4. faire la modification minimale ;
5. comparer comportement, lectures et latence avant/après ;
6. ne passer au lot suivant qu'après validation.

Les priorités signifient :

- **P0** : coût qui croît avec toute une collection sur un parcours interactif ;
- **P1** : I/O séquentielle ou requête non bornée pouvant provoquer latence, quota ou timeout ;
- **P2** : optimisation utile après mesure ;
- **P3** : entretien préventif, pas un incident de performance actuel.

## 2. Carte rapide des fichiers

| Priorité | Fichier principal | Problème | Complexité actuelle | Cible | Lot |
|---|---|---|---:|---:|---|
| P0 | `src/app/api/announcer/ads/route.ts` | Lit toutes les annonces avant pagination | `O(N log N)` | `O(K)` à `O(K log K)` | A |
| P0 | `src/components/favoris/SectionFavoris.tsx` | Une lecture réseau séquentielle par favori | latence `O(F × RTT)` | lots bornés | B |
| P1 | `functions/src/notification/index.ts` | Écritures séquentielles par destinataire | latence `O(U × RTT)` | batch/concurrence bornée | C |
| P1 | `functions/src/promotions/expire-promotions.ts` | Lit toutes les promotions actives | `O(P)` | `O(E)` expirées | D |
| P1 | `src/app/api/reels/feed/route.ts` | Limite reçue non plafonnée | jusqu'à `O(R)` | `O(K)`, `K ≤ 50` | E |
| P1 | `src/db/reel.db.ts` | Pages pleines ambiguës et curseur nécessitant `getDoc` | `O(K)` + lecture | `O(K)` en une requête | E |
| P1 | `src/db/property.db.ts` | Requête supplémentaire pour `hasMore` | `O(K)` + lecture | `O(K)` en une requête | F |
| P1 | `src/hooks/use-properties-pagination.ts` | Cache mutable, curseurs dupliqués, total de pages incorrect | mémoire croissante et état fragile | cache borné/curseurs stables | F |
| P2 | `src/data/gabon-osm-locations.ts` | Déduplication et proximité quadratiques | `O(Q² + Q×C)` | pré-calcul ou index spatial | G |
| P2 | `src/components/interactive-map/QuarterSearchCombobox.tsx` | Filtre et tri répétés sur chaque recherche/rendu | `O(L log L)` | `O(L)` ou index prétrié | G |
| P2 | `src/components/stepper/step3.components.tsx` | Tris répétés des options | `O(L log L)` par recalcul | tri unique/mémoïsé | G |
| P2 | `src/components/reels/ReelsFeedClient.tsx` | Le DOM et la mémoire croissent avec toutes les pages | `O(pK)` | fenêtre bornée | H |
| P2 | `src/components/search/SearchDesktopPage.tsx` | Accumulation des hits du défilement infini | `O(pK)` | virtualisation mesurée | H |
| P2 | `src/components/search/SearchMobilePage.tsx` | Même accumulation sur appareils contraints | `O(pK)` | virtualisation mesurée | H |
| P3 | `src/components/search/SearchPage.tsx` | Ancienne implémentation non importée et divergente | maintenance double | suppression prouvée | I |

`N` = annonces d'un propriétaire, `K` = taille de page, `F` = favoris, `U` = destinataires,
`P` = promotions actives, `E` = promotions expirées, `L` = lieux, `p` = pages chargées.

## 3. Lot A — « Mes annonces » sans scan complet

### Fichiers à lire avant modification

- `src/app/api/announcer/ads/route.ts`
- `src/db/property.db.ts`, fonction `searchOwnedProperties`
- `src/features/announcer/ad-management/ui/v1/AdManagementPage.tsx`
- `src/features/announcer/ad-management/hooks/useAdManagement.ts` si présent
- `src/features/announcer/listing-claim/services/listing-claim.service.ts`
- `src/models/annonce.d.ts`
- `firestore.indexes.json`
- `__tests__/api/announcer-ads.test.ts`
- `__tests__/e2e/reel-attach-property.spec.ts`

### Ce qui ne va pas

La route effectue deux `.get()` non bornés sur `createdBy` et `claimedBy`, fusionne avec une `Map`,
calcule plusieurs résumés, applique une chaîne de filtres, trie toute la collection et utilise un
offset numérique. Afficher 20 éléments peut donc lire et trier 10 000 documents.

### Solution simple, livrable rapidement

Si le besoin immédiat est seulement de protéger le serveur :

- imposer un plafond temporaire documenté, par exemple les 500 annonces les plus récentes par
  requête propriétaire ;
- appliquer `orderBy(sortTimestamp, desc)` et `limit(501)` aux deux requêtes ;
- retourner un indicateur `partialResults: true` si le plafond est atteint ;
- conserver les filtres actuels en mémoire dans cette fenêtre.

Cette solution réduit le pire cas mais **ne garantit pas** qu'une recherche ancienne soit trouvée.
Elle est un garde-fou temporaire, pas l'architecture finale.

### Solution recommandée

Ajouter à chaque annonce :

```ts
ownerUids: string[] // [createdBy] ou [createdBy, claimedBy]
```

Puis requêter :

```text
where ownerUids array-contains uid
+ filtres d'égalité compatibles
+ orderBy sortTimestamp desc
+ orderBy documentId desc
+ startAfter(sortTimestamp, id)
+ limit(K + 1)
```

Le second ordre sur l'identifiant rend la pagination déterministe. Le curseur HTTP doit être
opaque, versionné et validé, par exemple un base64url de `{v:1, sortTimestamp, id}` signé côté
serveur. Ne pas accepter un offset comme curseur final.

### Recherche textuelle : choix pragmatique

- Moins de quelques centaines d'annonces par compte : recherche dans une fenêtre bornée avec
  message explicite peut suffire temporairement.
- Besoin de recherche exhaustive : index Algolia privé filtré obligatoirement par `ownerUids` et
  clé sécurisée, ou endpoint serveur qui impose ce filtre.
- Éviter de fabriquer toutes les combinaisons de préfixes dans Firestore : écriture lourde,
  index volumineux et recherche approximative limitée.

### Compteurs et statistiques

La route doit continuer à retourner les contrats `scopeCounts`, `summary` et `categoryOptions`.
Trois possibilités, par ordre de simplicité :

1. `count()` séparés pour les compteurs simples, lancés avec un `Promise.all` fixe ;
2. cache court des agrégats si une cohérence de quelques secondes est acceptable ;
3. document `announcer_listing_stats/{uid}` maintenu transactionnellement pour les métriques
   complexes et les catégories.

Ne pas recalculer des statistiques globales à partir de la seule page courante.

### Migration sûre

- écrire `ownerUids` à la création et à la revendication ;
- backfill idempotent par lots avec checkpoint ;
- ajouter les index avant d'activer la nouvelle lecture ;
- activer une lecture miroir en préproduction ;
- comparer IDs, ordre, total, scopes et filtres ;
- basculer derrière un feature flag ;
- retirer l'ancien scan après une période d'observation.

### Tests obligatoires

Étendre `__tests__/api/announcer-ads.test.ts` avec :

- vérification qu'une requête contient une limite ;
- `K + 1` documents lus au maximum pour la page ;
- absence de doublon pour une annonce créée et réclamée ;
- ordre stable sur timestamps identiques ;
- insertion entre deux pages sans doublon ni omission ;
- curseur altéré ou mal formé rejeté ;
- compatibilité de tous les filtres et résumés existants.

Conserver les scénarios de `reel-attach-property.spec.ts`, car le sélecteur dépend de `scope=all`.

## 4. Lot B — Favoris chargés par lots

### Fichiers

- `src/components/favoris/SectionFavoris.tsx`
- `src/db/property.db.ts`
- tests de composant favoris à rechercher/créer sous `__tests__/components`

### Problème

Le composant appelle `getPropertyById` dans une boucle. Même si la complexité en lectures reste
linéaire, la profondeur séquentielle est `F × RTT`. Ce n'est pas un problème de calcul CPU, mais
c'est une mauvaise complexité de latence.

### Solution la plus simple

Ajouter `getPropertiesByIds(ids)` dans `property.db.ts` :

1. dédupliquer avec `new Set(ids)` ;
2. découper selon la limite documentée de l'opérateur Firestore `in` ;
3. exécuter deux ou trois lots simultanément au maximum ;
4. placer les résultats dans `Map<id, Property>` ;
5. reconstruire l'ordre initial par `ids.map(id => byId.get(id)).filter(Boolean)`.

Créer un petit utilitaire partagé `mapWithConcurrency(items, concurrency, worker)` uniquement si
plusieurs parcours en ont besoin. Sinon, garder l'implémentation locale : une abstraction générale
n'est pas nécessaire pour deux lots fixes.

### Cas d'erreur

Utiliser `Promise.allSettled` pour les lots seulement si une page partielle est acceptable.
Afficher les favoris disponibles et permettre de relancer les lots échoués. Un document supprimé
doit être ignoré, pas transformer toute la page en erreur.

### Tests

- ordre d'affichage identique à l'ordre des favoris ;
- doublons éliminés ;
- IDs inexistants ignorés ;
- limite de taille de chaque requête ;
- concurrence maximale respectée ;
- un lot échoué n'efface pas les lots réussis.

## 5. Lot C — Notifications en batchs résilients

### Fichiers

- `functions/src/notification/index.ts`
- `functions/src/notification/push.ts`
- `functions/src/notification/new-announcement-policy.ts`
- `functions/src/notification/favoris-property-policy.ts`
- tests sous `functions/__tests__/notification`

### Boucles concernées

- nouvelle annonce : marqueur de déduplication puis notification pour chaque utilisateur ;
- mise à jour d'une annonce favorite : création d'une notification par utilisateur ;
- suppression : nettoyage du favori puis création d'une notification par utilisateur.

### Solution simple

Pour les écritures Firestore indépendantes, constituer des batchs sous la limite Firestore et les
committer séquentiellement. Cela réduit le nombre d'allers-retours sans créer de rafale illimitée.

### Solution robuste à fort volume

- paginer la requête utilisateurs ;
- utiliser `BulkWriter` avec throttling ;
- conserver les marqueurs d'idempotence ;
- enregistrer un checkpoint par événement ;
- envoyer les pushes par groupes compatibles avec FCM ;
- journaliser `scanned`, `matched`, `written`, `skipped`, `failed` et la durée ;
- prévoir une reprise des erreurs permanentes et transitoires.

Ne pas remplacer aveuglément les boucles par `Promise.all(users.map(...))`. Avec 10 000
destinataires, cela lance 10 000 chaînes d'I/O en même temps.

### Tests

- aucun doublon lors du retry du même événement ;
- taille maximale d'un batch ;
- poursuite après l'échec isolé d'un destinataire ;
- reprise depuis checkpoint ;
- aucun envoi à l'auteur ;
- respect des préférences utilisateur.

## 6. Lot D — Expiration des promotions ciblée

### Fichiers

- `functions/src/promotions/expire-promotions.ts`
- `functions/src/promotions/expire-promotions.policy.ts`
- `functions/src/promotions/default-sort-timestamp.ts`
- routes et services qui créent/renouvellent une promotion
- `firestore.indexes.json`
- `functions/__tests__/promotions/expire-promotions.policy.test.ts`

### Problème

La fonction lit toutes les annonces `isPromoted == true`, puis appelle `needsPromotionExpiry` en
mémoire. Si `P` promotions sont actives mais seulement `E` sont expirées, elle paie `O(P)` pour
traiter `O(E)` éléments.

### Solution simple recommandée

Matérialiser un champ racine `promotionExpiresAt` au début/renouvellement de la promotion, puis :

```text
where isPromoted == true
where promotionExpiresAt <= now
orderBy promotionExpiresAt
limit(BATCH_SIZE)
```

Répéter avec un curseur tant qu'une page pleine est retournée. Indexer cette signature. Nettoyer
ou mettre à `null` le champ à l'expiration.

Cette solution est plus simple et plus lisible qu'un système de file de priorité séparé. Une file
ou Cloud Tasks ne devient pertinente que si l'expiration doit être exacte à la minute.

### Tests

- seules les promotions expirées sont lues/modifiées ;
- plusieurs pages sont traitées ;
- relance idempotente ;
- index documenté ;
- promotion renouvelée pendant le traitement non expirée à tort.

## 7. Lot E — Pagination des réels

### Fichiers

- `src/app/api/reels/feed/route.ts`
- `src/db/reel.db.ts`, `getPublicReels` et `getReelsByOwner`
- `src/components/reels/ReelsFeedClient.tsx`
- `src/components/reels/MyReelsClient.tsx`
- `__tests__/api/reels-feed.test.ts`
- `__tests__/components/my-reels-client.test.tsx`

### Correctif minimal

Dans la route, remplacer le `parseInt` direct par une fonction identique au contrat de
`/api/property/list` : entier fini, valeur par défaut 10, minimum 1, maximum 50. Revalider aussi
dans `reel.db.ts`, car la couche DB peut être appelée ailleurs.

### Pagination correcte

Lire `K + 1`, retourner `K` et définir `hasMore` avec l'élément supplémentaire. Le comportement
actuel considère toute page exactement pleine comme suivie d'une autre page, même si elle est la
dernière.

Solution simple : conserver le curseur ID et la lecture `getDoc`.  
Solution optimisée : curseur opaque signé contenant `createdAt` et `id`, puis
`startAfter(createdAt, id)`. N'adopter la seconde que si la lecture de curseur est mesurable ou si
une API entièrement serveur est mise en place.

### Tests

- limites négative, zéro, décimale, `NaN` et très grande ;
- page incomplète, pleine sans suite et pleine avec suite ;
- curseur supprimé/invalide ;
- ordre déterministe et absence de doublon.

## 8. Lot F — Pagination publique des annonces

### Fichiers

- `src/db/property.db.ts`, `getProperties`
- `src/app/api/property/list/route.ts`
- `src/hooks/use-properties-pagination.ts`
- `__tests__/db/property.db.test.ts`
- tests de la route liste à créer/compléter

### Correctif DB

Appliquer la limite avant lecture à `K + 1`, retirer l'élément supplémentaire et utiliser le
dernier élément **retourné** comme curseur. Supprimer la seconde requête `limit(1)`.

### Correctif du hook

Le hook actuel présente trois fragilités :

- `fetchedPages` est un objet mutable créé avec `useMemo`, donc les mutations échappent au modèle
  d'état React ;
- `setLastDocs(prev => [...prev, res.lastDoc])` peut dupliquer des curseurs lors d'un refetch ;
- `totalPages = ceil(properties.length / limitPerPage)` ne représente que la page courante et vaut
  presque toujours 1.

Solution simple : exposer seulement `hasNext`, `hasPrevious`, `nextPage` et `previousPage`, avec
un `useRef<Map<number, FetchedPage>>` et une table de curseurs indexée par page. Ne pas afficher un
nombre total de pages si aucun `count()` n'est demandé.

Solution alternative si le nombre total est indispensable : lancer un `count()` séparé, mettre
son résultat en cache, et accepter qu'il soit légèrement décalé des pages lors d'écritures
concurrentes.

### Tests

- navigation avant/arrière sans nouvelle lecture d'une page en cache ;
- reset efface pages et curseurs ;
- refetch ne duplique pas les curseurs ;
- dernière page pleine correctement détectée ;
- changement de filtre invalide le cache associé.

## 9. Lot G — Géographie sans sur-ingénierie

### Fichiers

- `src/data/gabon-osm-locations.ts`
- `src/lib/geo-haversine.ts`
- `src/lib/location/gabon-osm-projection.server.ts`
- `src/lib/location/gabon-location-catalog.ts`
- `src/hooks/useOSMLocations.ts`
- `src/components/interactive-map/QuarterSearchCombobox.tsx`
- `src/components/stepper/step3.components.tsx`

### Coûts identifiés

- déduplication des quartiers avec `unique.some` : pire cas `O(Q²)` ;
- ville la plus proche pour chaque quartier : `O(Q × C)` ;
- province la plus proche pour chaque ville : `O(C × P)` ;
- tris dans plusieurs composants : `O(L log L)` répété.

Le chargeur principal est caché au niveau module. Le coût peut donc être acceptable s'il ne se
retrouve pas dans le bundle client ou sur chaque instance serverless froide.

### Solution simple d'abord

- générer le catalogue sérialisé lors du build ou dans un script contrôlé ;
- charger directement les tableaux et dictionnaires prétriés ;
- remplacer la déduplication par une `Map<nomNormalisé, lieux>` puis ne comparer la distance
  qu'entre homonymes ;
- ne plus appeler `.sort()` dans les composants ;
- utiliser `useMemo` pour le filtre textuel des combobox.

Cette approche ramène la plupart du travail runtime à `O(L)` et évite d'introduire une dépendance.

### Solution avancée uniquement si nécessaire

Une grille géographique, un geohash ou un k-d tree réduit les recherches de proximité. Ne
l'implémenter que si le catalogue devient beaucoup plus grand ou si le calcul reste dans un chemin
chaud après pré-calcul. Pour le volume actuel du Gabon, un artefact généré au build est probablement
plus simple, moins risqué et suffisamment rapide.

### Tests

- résultat sérialisé identique au catalogue actuel ;
- homonymes éloignés conservés et doublons proches supprimés ;
- associations ville/province et quartier/ville inchangées ;
- aucun tri lors des re-rendus ;
- temps et taille du chargement mesurés.

## 10. Lot H — Mémoire des listes infinies

### Fichiers

- `src/components/search/SearchDesktopPage.tsx`
- `src/components/search/SearchMobilePage.tsx`
- `src/components/reels/ReelsFeedClient.tsx`
- composants cartes et slides associés

### Problème

Le réseau est paginé, mais le navigateur conserve et rend les pages déjà chargées. Après `p`
pages, mémoire et nombre de nœuds peuvent atteindre `O(pK)`. Sur mobile et vidéo, cela peut devenir
plus coûteux que la recherche elle-même.

### Solution simple

- mesurer d'abord à 5, 10 et 25 pages ;
- mettre en pause les vidéos hors écran ;
- ne conserver chargées que la vidéo courante et ses voisines ;
- appliquer `content-visibility: auto` aux longues listes compatibles ;
- limiter les images préchargées aux premiers résultats.

### Solution avancée

Virtualiser les cartes si le DOM dépasse le budget mesuré. Pour un feed vertical plein écran, une
fenêtre manuelle de 3 à 5 slides est souvent plus simple qu'une bibliothèque de grille virtuelle.
Conserver séparément les IDs et métadonnées nécessaires au retour arrière.

Tests : navigation au clavier/tactile, position de scroll, focus, impression publicitaire,
chargement d'image et absence de relecture excessive lors du recyclage des cellules.

## 11. Lot I — Nettoyage de la recherche historique

### Fichiers

- `src/components/search/SearchPage.tsx`
- `src/components/search/SearchPageComponent.tsx`
- `src/components/search/SearchDesktopPage.tsx`
- `src/components/search/SearchMobilePage.tsx`
- `src/lib/search/search-filter-query.ts`

La route publique importe `SearchPageComponent`, pas `SearchPage`. Confirmer avec TypeScript,
`rg` et le graphe de build qu'aucun import dynamique ne référence l'ancien composant. Ensuite :

- supprimer le fichier mort ;
- garder `buildPublicSearchFilters` comme constructeur canonique ;
- empêcher les variantes desktop/mobile de reconstruire différemment les mêmes filtres ;
- conserver les tests de synchronisation URL, Mode/Immobilier et attributs dynamiques.

Ce nettoyage n'améliore presque pas la complexité runtime actuelle. Il réduit surtout le risque de
réintroduire une recherche moins sûre ou un filtrage divergent.

## 12. Création et modification : fichiers et décisions

Le guide détaillé reste
[Création/modification des annonces et réels](../../performance-creation-modification-annonces-reels.md).
Pour se repérer rapidement :

| Parcours | Fichiers centraux | Action |
|---|---|---|
| Immobilier | `src/providers/property.form.provider.tsx` | instrumenter chaque phase, conserver les patches ciblés |
| Images | `src/db/file.db.ts` | conserver `uploadPropertyImages` à concurrence bornée ; pas de `Promise.all` illimité |
| Mode | `src/app/(protected)/category-listing/create/page.tsx` | éviter les recompressions ; garder upload avant débit IA selon le contrat métier |
| Écriture annonce | `src/db/property.db.ts`, `src/db/generic.db.ts` | une écriture canonique, effets secondaires hors chemin critique |
| Création réel | `src/components/reels/CreateOrphanReelClient.tsx`, `src/db/reel.db.ts` | upload reprenable, progression, traitement asynchrone |
| Modification réel | `src/components/reels/EditReelClient.tsx` | paralléliser seulement les effets indépendants best-effort |
| Transcodage | `functions/src/reels/transcode.ts` | garder les dépendances séquentielles ; contrôler la concurrence d'instances |
| Localisation | `functions/src/location/location-sync.service.ts` et trigger | idempotence, effets hors réponse utilisateur |

La solution simple quand une chaîne paraît trop longue n'est pas toujours `Promise.all`. Elle est
souvent de répondre après l'écriture métier indispensable, puis de laisser un trigger idempotent
effectuer notification, indexation, statistiques ou invalidation.

## 13. Fichiers examinés mais sans correction algorithmique urgente

| Zone | Fichiers représentatifs | Pourquoi ne pas optimiser maintenant |
|---|---|---|
| Recherche Algolia | `lib/search/search-filter-query.ts`, `lib/algolia-search-proxy.ts`, `lib/seo/algolia-listings.ts` | travail borné par paramètres/page et délégué au moteur |
| Carte | `app/api/map/properties/route.ts` | requête filtrée, limite 200 et cache CDN ; ajouter seulement `truncated` |
| Recommandations actuelles | `db/recommend.db.ts` | requêtes déjà limitées ; qualité simple mais coût borné |
| Historique crédits | `db/credit-transaction.db.ts` | bon modèle `K + 1` et curseur, à réutiliser |
| Cache Algolia | `lib/algolia-search-proxy.ts` | `Promise.all` porte sur un nombre fixe de clés de cache |
| Chargement de modules | plusieurs routes avec `Promise.all([import(), import()])` | nombre fixe et opérations indépendantes |
| Tris de petits enums | formulaires et constantes | `n` faible et borné ; optimiser seulement s'ils sont répétés au rendu |

Un fichier de 1 000 lignes n'a pas automatiquement une mauvaise complexité. Sa taille relève de la
maintenabilité ; elle ne justifie pas une refonte de performance sans chemin coûteux identifié.

## 14. Ordre concret des pull requests

| PR | Contenu | Risque | Pré-requis |
|---|---|---|---|
| 1 | Bornes API réels + tests | Faible | Aucun |
| 2 | Pagination annonces `K + 1` + correction du hook | Faible à moyen | Tests DB/hook |
| 3 | Favoris par lots | Moyen | Helper local de batch |
| 4 | Catalogue géographique pré-calculé | Moyen | Snapshot de référence |
| 5 | Promotions ciblées + index | Moyen | Migration du champ expiration |
| 6 | Notifications paginées/batchées | Élevé | Idempotence et observabilité |
| 7 | `ownerUids`, backfill et index | Élevé | Double écriture |
| 8 | Nouvelle route « Mes annonces » derrière flag | Élevé | PR 7 déployée |
| 9 | Virtualisation, uniquement si budgets dépassés | Moyen | Mesures navigateur |
| 10 | Nettoyage du composant de recherche mort | Faible | Preuve de non-usage |

Ne pas mélanger la migration `ownerUids` avec des changements visuels ou une refonte des
composants. Cela rendrait la comparaison et le rollback difficiles.

## 15. Checklist de validation d'une PR

- [ ] Le résultat fonctionnel est identique ou le changement de contrat est documenté.
- [ ] La limite est imposée côté serveur et à nouveau dans la couche de données.
- [ ] Le curseur contient tous les champs nécessaires à un ordre déterministe.
- [ ] Aucun tri global n'est effectué après une lecture bornée arbitraire.
- [ ] Aucun `await` dans une boucle dépendante des données sans justification écrite.
- [ ] Tout parallélisme dépendant des données possède une limite de concurrence.
- [ ] L'index Firestore/Algolia nécessaire est versionné avant le code qui l'utilise.
- [ ] Les lectures, écritures, payload et p95 sont comparés avant/après.
- [ ] Les tests existants passent.
- [ ] Un test empêche le retour à la lecture complète ou à la concurrence illimitée.
- [ ] Le rollback ou feature flag est prévu pour les lots à risque.

## 16. Définition de terminé

Cette partie est terminée lorsque le développeur peut démontrer, sur les datasets de référence :

- qu'afficher 20 annonces ne lit jamais toute la collection ;
- que les coûts des listes publiques et privées dépendent de `K`, pas de `N` ;
- que les favoris n'attendent plus un aller-retour par annonce ;
- que les fonctions de masse sont paginées, idempotentes et bornées ;
- que les créations/modifications n'attendent que les opérations indispensables ;
- que le navigateur reste dans son budget mémoire après un long scroll ;
- que les résultats, l'ordre et les compteurs restent compatibles avec les tests existants.

