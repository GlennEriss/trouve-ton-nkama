# Audit intégral de complexité algorithmique — Location Maison

Date de référence : 13 septembre 2026  
Statut : analyse statique avant implémentation  
Périmètre : `apps/location-maison/src` et `apps/location-maison/functions/src`

## 1. Résultat exécutif

L'application n'a pas un problème généralisé de complexité quadratique. La majorité des fichiers
sont des composants, modèles ou adaptateurs dont le coût est constant ou linéaire sur de petites
collections. Les risques principaux viennent plutôt du **volume lu avant traitement**, des
**allers-retours réseau séquentiels** et de quelques tris/filtres répétés.

Les cinq constats les plus importants sont :

| Priorité | Zone | État actuel | Risque à l'échelle | Décision proposée |
|---|---|---|---|---|
| P0 | `GET /api/announcer/ads` | Charge toutes les annonces créées et réclamées, puis filtre, trie et pagine en mémoire | Lectures `O(N)`, tri `O(N log N)`, mémoire `O(N)` pour afficher au plus 50 éléments | Construire des requêtes paginées/indexées ; traiter l'union des deux propriétaires avec curseurs |
| P0 | Favoris | Lit chaque annonce par identifiant dans une boucle séquentielle | Latence `O(F × RTT)` | Requêtes `documentId in (...)` par lots et concurrence bornée |
| P1 | Notifications favoris | Met à jour les utilisateurs séquentiellement | Latence `O(U × RTT)` et risque de timeout | `BulkWriter`/batchs bornés, reprise et idempotence |
| P1 | Création/modification | Le coût dominant est I/O : compression, upload, géographie et écritures dépendantes | La latence s'additionne si les opérations indépendantes restent séquentielles | Conserver la concurrence bornée des médias et sortir les effets secondaires du chemin critique |
| P2 | Catalogue géographique | Plusieurs regroupements, scans et tris en mémoire | Jusqu'à `O(C × Q)` lors de rapprochements géographiques | Préindexer avec `Map`, mémoïser et calculer hors rendu |

La recherche publique, le chargement public des annonces et le flux public des réels sont déjà
globalement sur la bonne trajectoire : Algolia applique les filtres côté moteur ; Firestore utilise
des `limit` et des curseurs ; les routes publiques possèdent un cache. Il faut préserver ces
propriétés par des tests de non-régression.

## 2. Ce que signifie « audit intégral »

### 2.1 Périmètre réellement parcouru

Le scan porte sur **924 fichiers TypeScript/TSX/JavaScript exécutables**, soit environ **109 466
lignes**, après exclusion volontaire de :

- `node_modules`, `.next` et le JavaScript compilé de `functions/lib` ;
- tests unitaires/E2E, fixtures, rapports de couverture et assets ;
- autres applications du monorepo.

Les tests ont été recherchés séparément afin d'identifier les protections existantes. Le scan a
relevé notamment 204 filtres, 47 tris, 12 réductions, 156 boucles, 53 `Promise.all`, 31 appels
`getDocs`, 14 appels `getDoc`, 42 limites et 9 curseurs `startAfter`. Ces nombres servent à repérer
les candidats ; ils ne constituent pas à eux seuls une preuve de lenteur.

### 2.2 Classification appliquée à chaque fichier

Chaque fichier entre dans l'une des classes suivantes :

| Classe | Exemples | Niveau d'analyse |
|---|---|---|
| Déclaratif, type, constante | `models`, `constantes`, styles | `O(1)` ; aucun enjeu de croissance métier |
| Présentation bornée | cartes, modales, formulaires | `O(k)` sur les éléments déjà chargés ; surveiller les re-rendus |
| Transformation locale | `map`, `filter`, `reduce`, normalisation | calcul de `O(n)` à `O(n log n)` |
| Accès aux données | `db`, routes API, repositories | volume lu, index, limite, curseur et coût réseau examinés |
| Traitement en masse | notifications, analytics, imports, médias | batch, idempotence, concurrence et timeout examinés |

Une annexe de 924 lignes donnerait une fausse impression de précision : écrire « `O(1)` » en face
d'un composant statique n'aide pas à décider. L'exhaustivité est donc assurée par le scan de tous
les fichiers ; la revue détaillée ci-dessous se concentre sur tous les fichiers qui manipulent une
collection, une requête ou plusieurs opérations asynchrones.

## 3. Modèle de coût utilisé

On note :

- `N` : nombre total d'annonces concernées ;
- `K` : taille d'une page, normalement 10 à 50 ;
- `F` : nombre de favoris d'un utilisateur ;
- `R` : nombre de réels ;
- `I` : nombre d'images d'une annonce ;
- `U` : nombre d'utilisateurs destinataires ;
- `L` : nombre d'entités géographiques ;
- `RTT` : durée d'un aller-retour réseau.

Pour une application distribuée, `O(n)` ne suffit pas. Les quatre dimensions à documenter sont :

1. complexité CPU ;
2. mémoire transférée et conservée ;
3. nombre de lectures/écritures facturées ;
4. profondeur séquentielle du chemin critique, approximativement la somme des `RTT` dépendants.

Ainsi, 20 requêtes parallèles restent `O(20)`, mais peuvent être plus rapides et plus dangereuses
pour les quotas. Toute parallélisation doit donc être **bornée**, sauf pour un très petit nombre
fixe d'opérations indépendantes.

## 4. Recherche publique

### État actuel

`SearchPageComponent` dirige la page vers les variantes desktop/mobile, qui reposent sur Algolia.
`buildPublicSearchFilters` transforme les paramètres d'URL en filtres facettés et numériques.
La pagination est fournie par `useInfiniteHits` ; les résultats ne sont pas tous téléchargés avant
filtrage. Les facettes seules utilisent `hitsPerPage: 0` et le proxy Algolia dispose de caches
distincts.

Complexité applicative :

- construction des filtres : `O(P + V)`, avec `P` paramètres et `V` valeurs multisélectionnées ;
- rendu d'une page : `O(K)` ;
- recherche et tri : délégués à l'index Algolia, et non `O(N)` dans le navigateur ;
- mémoire du défilement infini : `O(p × K)` après `p` pages, car les hits précédents restent
  affichés.

### Points à corriger ou consolider

1. `src/components/search/SearchPage.tsx` contient une ancienne construction manuelle de filtres,
   mais la route importe `SearchPageComponent`. Ce fichier mort risque de diverger du constructeur
   canonique et doit être supprimé après preuve d'absence d'import.
2. La variante historique interpole certaines valeurs sans l'échappement assuré par
   `buildPublicSearchFilters`. Ne pas la réactiver.
3. Le défilement infini peut finir par rendre plusieurs centaines de cartes. Ajouter une
   virtualisation ou une fenêtre de rendu lorsque les mesures montrent plus de 100–200 cartes.
4. Vérifier dans la configuration Algolia que chaque filtre dynamique exposé est bien une facette,
   et que les tris alternatifs utilisent des répliques plutôt qu'un tri client.

### Tests à ajouter

- contrat : une requête retourne au maximum `K` hits ;
- échappement des caractères spéciaux et rejet des clés `attr_*` invalides ;
- conservation des filtres Mode/Immobilier ;
- absence de tri global côté client ;
- test de performance synthétique à 10 000 objets dans l'index de test, avec seuil p95.

## 5. Chargement public des annonces

### État actuel

`db/property.db.ts:getProperties` applique état, modération, ordre et `limit(K)` dans Firestore,
puis utilise `startAfter`. La route `/api/property/list` borne `K` entre 1 et 50 et cache chaque
page. La complexité applicative est `O(K)` en temps/mémoire, indépendamment de `N`, sous réserve que
l'index composite existe.

Un appel supplémentaire `limit(1)` détermine si une page suivante existe. Cette stratégie évite
une page vide mais ajoute un aller-retour et une lecture. La stratégie `limit(K + 1)`, déjà utilisée
pour l'historique des crédits, permettrait de déterminer `hasMore` en une seule requête.

### Décision proposée

- remplacer la double lecture par `limit(K + 1)`, retourner les `K` premiers documents et garder
  le dernier affiché comme curseur ;
- ne jamais accepter `limitPerPage <= 0` dans la couche DB, même si la route le borne déjà ;
- conserver une pagination par curseur, jamais `offset`, pour les listes publiques ;
- valider les index par des tests émulateur et par une vérification de déploiement.

Complexité cible : lecture et sérialisation `O(K)`, mémoire `O(K)`, une requête Firestore par page.

## 6. Filtres, tri et pagination de « Mes annonces »

### Problème confirmé

`app/api/announcer/ads/route.ts` exécute deux requêtes non bornées :

- toutes les annonces dont `createdBy == uid` ;
- toutes les annonces dont `claimedBy == uid`.

Il fusionne les documents, parcourt plusieurs fois la collection pour les compteurs et filtres,
trie tout le résultat, puis applique seulement `slice(cursor, cursor + limit)`.

Coût actuel pour une requête :

- lectures : jusqu'à `O(N)` ;
- déduplication et filtres : plusieurs passes `O(N)` ;
- tri : `O(N log N)` ;
- mémoire serveur : `O(N)` ;
- réponse réseau : `O(K)`, ce qui masque le coût réel au navigateur.

C'est acceptable avec quelques dizaines d'annonces par annonceur, mais sa dégradation est directe
avec la croissance. L'offset textuel (`"20"`, `"40"`) n'est pas un vrai curseur stable : une
insertion entre deux pages peut déplacer les résultats.

### Architecture cible sans casser les usages

Firestore ne gère pas naturellement l'union paginée de `createdBy` et `claimedBy`. Procéder en deux
étapes :

1. introduire un champ canonique `ownerUids: [createdBy, claimedBy?]` et le maintenir à la création,
   à la revendication et lors des migrations ;
2. interroger `array-contains uid`, appliquer les égalités disponibles, `orderBy`, `limit(K + 1)` et
   `startAfter` côté Firestore.

Pour la recherche texte libre dans les annonces privées, deux options : index Algolia sécurisé par
`ownerUids`, ou champ de préfixes/tokens normalisés si les besoins sont simples. Ne pas reproduire
une recherche `includes` après lecture complète.

Les résumés globaux et compteurs ne doivent pas forcer le chargement de tous les documents. Les
maintenir dans un document agrégé par annonceur ou utiliser des agrégations `count()` séparées et
parallèles. Les métriques monétaires complexes peuvent être mises à jour transactionnellement à
chaque mutation.

### Migration progressive

1. ajouter `ownerUids` en écriture double ;
2. backfill idempotent avec checkpoint ;
3. créer les index composites correspondant aux filtres réellement exposés ;
4. livrer la nouvelle lecture derrière un feature flag ;
5. comparer identifiants, ordre, compteurs et pages entre ancien et nouveau chemin ;
6. basculer puis retirer la lecture complète.

### Tests indispensables

- annonce créée, réclamée et créée puis réclamée sans doublon ;
- ordre stable quand deux annonces partagent la même date : ajouter l'ID comme second critère ;
- insertion/suppression entre deux pages ;
- chaque filtre et chaque ordre ;
- limite stricte `K + 1` vérifiée sur le mock ou l'émulateur ;
- dataset de 10 000 annonces appartenant au même compte pour comparer coût et p95.

## 7. Réels

`db/reel.db.ts` applique `orderBy(createdAt)`, `limit(K)` et un curseur Firestore aussi bien pour le
flux public que pour les réels du propriétaire. La route de flux ajoute un cache. Le coût des
lectures reste `O(K)`.

Points de vigilance :

- `/api/reels/feed` accepte actuellement un `limitPerPage` parsé sans borne explicite ; appliquer
  la même validation 1–50 que `/api/property/list` ;
- un curseur transmis comme ID provoque une lecture `getDoc` avant la page ; préférer un curseur
  opaque contenant les champs de tri, signé côté serveur, si cette lecture devient significative ;
- le client conserve les pages chargées : envisager la virtualisation vidéo ;
- le transcodage est volontairement séquentiel entre téléchargement, sonde et encodage. Un
  `Promise.all` ne peut pas paralléliser des dépendances. Seuls la miniature et certains uploads
  indépendants peuvent l'être, sous contrôle CPU/mémoire.

Tests : bornage du paramètre, curseur invalide, ordre stable, absence de doublon entre pages,
mémoire du feed long et reprise après échec de transcodage.

## 8. Favoris

`components/favoris/SectionFavoris.tsx` découpe les IDs mais appelle ensuite
`getPropertyById` dans une boucle `await`. Pour `F` favoris, la profondeur réseau vaut
approximativement `F × RTT` et le nombre de lectures vaut `F`.

Correction :

- dédupliquer les IDs avec un `Set` : `O(F)` ;
- charger par lots compatibles avec l'opérateur Firestore `in` sur `documentId()` ;
- exécuter un petit nombre de lots avec une concurrence bornée ;
- reconstruire l'ordre utilisateur via une `Map`, en `O(F)` ;
- conserver les IDs introuvables sans faire échouer tout le lot.

Éviter un `Promise.all` illimité : il réduit la latence mais crée une rafale de lectures et peut
épuiser les connexions sur un grand compte.

## 9. Géographie, filtres locaux et carte

Le catalogue OSM effectue plusieurs parcours et tris. Certaines associations entre villes et
quartiers calculent des distances dans des boucles imbriquées, soit potentiellement `O(C × Q)`.
Le volume gabonais reste borné aujourd'hui, mais ce code ne doit pas être exécuté à chaque rendu.

La route carte filtre côté Firestore et borne le résultat à 200 : coût applicatif `O(min(N, 200))`.
Le cache CDN réduit les lectures répétées. Il faut cependant documenter que `totalCount` représente
le nombre retourné, pas nécessairement le total réel lorsque la limite est atteinte.

Actions :

- construire une seule fois les dictionnaires `province → villes` et `ville → quartiers` ;
- utiliser `Map`/`Set` pour les recherches répétées au lieu de `find`/`includes` imbriqués ;
- trier lors de la construction du catalogue, pas dans chaque composant ;
- mémoïser les listes filtrées ;
- pour la proximité, introduire une grille/geohash si le catalogue croît fortement ;
- retourner `hasMore` ou `truncated: true` sur la route carte à 200 résultats.

## 10. Création et modification d'annonces

Ici, la complexité asymptotique est rarement le premier facteur : `I` reste petit, mais chaque
image implique compression, upload et récupération d'URL. La durée perçue dépend de la profondeur
du graphe asynchrone.

Le travail détaillé est centralisé dans
[l'audit création/modification](../../performance-creation-modification-annonces-reels.md). Les
règles algorithmiques à appliquer sont :

- compression : `O(I × pixels)` ; ne pas recompresser le même fichier ;
- upload : concurrence **bornée**, pas série complète et pas `Promise.all` illimité ;
- géographie : aucune création province/ville/quartier dans le chemin critique utilisateur ;
- écritures indépendantes : paralléliser uniquement après obtention de l'ID canonique ;
- invalidation SEO, analytics et notifications : hors chemin critique avec idempotence ;
- modification d'un seul champ : envoyer un patch, pas relire/réécrire toute l'annonce ;
- interface optimiste uniquement si une erreur serveur restaure l'état précédent.

Le gain doit être mesuré par phase : validation, compression, upload par fichier, écriture annonce,
effets secondaires et navigation. Sans cette ventilation, ajouter `Promise.all` peut déplacer le
goulot vers le réseau ou provoquer des échecs intermittents.

## 11. Cloud Functions et traitements de masse

### Notifications

`functions/src/notification/index.ts` parcourt les utilisateurs correspondants. Au moins une
boucle effectue une mise à jour avec `await` par utilisateur. Pour `U` destinataires, la latence
peut devenir `O(U × RTT)`.

Cible : requêtes bornées/paginées, `BulkWriter` ou batchs, concurrence bornée pour les appels FCM,
checkpoint, idempotence et dead-letter/reprise. Ne jamais charger toute la collection utilisateurs.

### Expiration des promotions

La requête lit toutes les annonces promues, filtre les expirées en mémoire, puis écrit par chunks.
Ajouter un champ interrogeable d'expiration active et une requête `endDate <= now`, paginée. Le
traitement devient `O(E)` sur les promotions réellement expirées au lieu de `O(P)` sur toutes les
promotions actives.

### Synchronisation AdSense et analytics

Les boucles et appels externes sont attendus pour une synchronisation planifiée. Le besoin n'est
pas un `Promise.all` global mais une pagination d'API, des limites de concurrence, un checkpoint et
une durée maximale observable.

### Transcodage vidéo

L'encodage est `O(nombre_de_frames × résolution)` et consommateur de CPU/mémoire. Il doit rester
hors requête utilisateur. Paralléliser plusieurs encodages dans la même instance est généralement
contre-productif ; dimensionner la concurrence au niveau de la plateforme.

## 12. Indexation

`firestore.indexes.json` contient déjà des index composites pour plusieurs variantes de propriétés,
réels, modération et promotions. Un index n'est utile que s'il correspond exactement aux égalités,
au tri et au curseur de la requête cible.

Avant toute modification :

1. lister les requêtes réelles par endpoint ;
2. écrire pour chacune : collection, égalités, intervalle, ordre, limite et curseur ;
3. comparer cette signature aux index déclarés et réellement déployés ;
4. supprimer seulement les index prouvés inutilisés, car ils augmentent le coût d'écriture ;
5. tester sur l'émulateur puis préproduction avec un volume représentatif.

Pour Algolia : facettes pour filtres, attributs numériques pour intervalles, `searchableAttributes`
pour le texte et répliques pour les tris. Ne jamais télécharger les hits pour refaire le tri global
dans React.

## 13. Tableau Big O des parcours critiques

| Parcours | Actuel | Cible | Observation |
|---|---:|---:|---|
| Recherche publique | `O(K)` côté app | `O(K)` | Bon : moteur indexé |
| Page publique d'annonces | `O(K)` + requête de contrôle | `O(K)` en une requête | Passer à `K + 1` |
| Mes annonces | `O(N log N)` | `O(K log K)` côté app/moteur | Priorité P0 |
| Flux de réels | `O(K)` | `O(K)` | Borner l'entrée API |
| Favoris | `O(F × RTT)` en latence | `O(ceil(F/B) × RTT/C)` | Lots de taille `B`, concurrence `C` |
| Filtres d'UI | souvent `O(K)` | `O(K)` | Mémoïser si rendu fréquent |
| Carte par quartier | `O(min(N,200))` | identique | Signaler la troncature |
| Catalogue géographique | jusqu'à `O(C × Q)` | `O(C + Q)` hors proximité | Préindexer |
| Images d'annonce | `O(I × pixels)` | identique, mur-clock réduit | Concurrence bornée |
| Notifications de masse | jusqu'à `O(U × RTT)` | `O(U)` en batchs bornés | Résilience obligatoire |

## 14. Plan d'implémentation sans casser l'existant

### Lot 0 — Mesurer et figer les contrats

- métriques p50/p95/p99, nombre de documents lus, payload et nombre de requêtes ;
- tests de contrat des réponses actuelles ;
- jeux de données 20, 500 et 10 000 annonces ;
- budgets : page publique ≤ 21 lectures pour `K=20`, aucune route listant plus de 50 éléments,
  aucune boucle réseau non bornée.

### Lot 1 — Corrections à faible risque

- borner `/api/reels/feed` ;
- remplacer le look-ahead des listes par `K + 1` ;
- supprimer le composant de recherche mort après validation ;
- signaler la troncature de la carte ;
- mémoïser/préindexer les catalogues géographiques.

### Lot 2 — Favoris et boucles réseau

- batcher les lectures favoris ;
- introduire un helper de concurrence bornée partagé ;
- ajouter tests de résultats partiels, quotas et ordre stable.

### Lot 3 — Mes annonces

- champ `ownerUids`, double écriture, backfill et index ;
- nouvelle pagination par curseur derrière flag ;
- agrégats de compteurs ;
- comparaison automatique ancien/nouveau ;
- retrait du scan complet lorsque l'équivalence est démontrée.

### Lot 4 — Fonctions en masse

- pagination, batchs, checkpoints, retry et idempotence pour notifications/promotions ;
- limites de concurrence mesurées ;
- alertes sur durée, erreurs et volume facturé.

### Lot 5 — Création/modification

- appliquer dans l'ordre les lots définis dans l'audit spécialisé ;
- ne modifier le graphe asynchrone qu'avec des chronométrages avant/après ;
- conserver les tests E2E immobilier, Mode et réels.

## 15. Stratégie de tests

### Tests unitaires

- constructeurs de filtres et curseurs ;
- déduplication et fusion d'IDs ;
- ordre déterministe avec tie-breaker ;
- tailles de lots et limite de concurrence ;
- validation des bornes API.

### Tests d'intégration Firestore/Algolia

- chaque requête s'exécute avec les index déclarés ;
- `K + 1` documents au maximum sont lus ;
- aucune omission ni duplication entre pages ;
- résultat identique avant/après migration ;
- filtres combinés et tris sur volumes réalistes.

### Tests E2E à préserver

Le dépôt possède déjà des tests pour la recherche/consultation, le feed des réels, la pagination
de rattachement d'un réel, l'API « Mes annonces » et les créations/modifications. Ils constituent
la base de non-régression. Ajouter des assertions de volume au niveau intégration : un E2E valide
le comportement, pas le nombre de documents facturés.

### Tests de performance

Mesurer séparément : temps serveur, temps réseau, TTFB, documents lus, taille JSON, durée de rendu,
long tasks et mémoire navigateur. Les seuils sont comparés au même dataset et au même environnement.

## 16. Règles de revue à institutionnaliser

Toute nouvelle liste doit répondre dans la PR à ces questions :

- Où le filtre et le tri sont-ils exécutés ?
- Quelle limite maximale est imposée côté serveur ?
- Le curseur est-il stable et déterministe ?
- Quel index sert la requête ?
- Combien de lectures pour afficher 20 éléments ?
- Une boucle contient-elle un appel réseau ? Si oui, quelle concurrence et quelle reprise ?
- La mémoire du client croît-elle avec toutes les pages consultées ?
- Quels tests empêchent le retour à une lecture complète ?

## 17. Critères de fin de l'audit d'implémentation

L'optimisation sera considérée terminée lorsque :

- aucune route interactive ne lit une collection complète pour produire une page bornée ;
- toutes les limites entrantes sont validées et plafonnées ;
- toutes les listes volumineuses utilisent un curseur stable ;
- les index nécessaires sont versionnés et vérifiés ;
- aucune boucle interactive ne contient d'I/O séquentielle non justifiée ;
- les parcours création/modification exposent la durée de chaque phase ;
- les tests fonctionnels existants passent et les tests de coût ajoutés passent ;
- les p95 avant/après et le nombre de lectures avant/après sont consignés.

## 18. Ce que `Promise.all` résout — et ne résout pas

Utiliser `Promise.all` uniquement lorsque les opérations sont indépendantes et en nombre fixe :
charger deux modules, deux agrégats ou deux ressources sans dépendance. Pour des listes contrôlées
par les données (`I`, `F`, `U`, `N`), préférer une concurrence bornée.

`Promise.all` ne corrige pas :

- une requête Firestore sans `limit` ;
- un tri de `N` éléments pour en afficher 20 ;
- un index manquant ;
- une dépendance réelle entre upload, ID et écriture ;
- une accumulation infinie de composants dans le navigateur.

La règle directrice est donc : **réduire d'abord le travail total, puis paralléliser seulement le
travail restant qui est réellement indépendant**.
