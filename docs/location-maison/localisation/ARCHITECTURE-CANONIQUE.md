# Localisation canonique des annonces

## Décision

Le formulaire public ne considère plus la saisie libre ni Google Maps comme
l'unique source de vérité. La localisation repose sur deux sources vérifiées :

1. le catalogue Gabon administré par Trouve Ton Nkama (`geo_provinces`,
   `geo_cities`, `geo_quarters`) ;
2. Google Places, restreint au Gabon, lorsque le lieu n'existe pas encore dans
   le catalogue.

Une annonce ne peut être publiée que si la ville et le quartier ont été choisis
dans les propositions. Toute modification manuelle après une sélection efface
les identifiants et remet `locationSource` à `UNVERIFIED`.

## Pourquoi Google ne suffit pas

La couverture et les noms Google sont incomplets pour certains quartiers du
Gabon. Au 20 juillet 2026, une requête réelle sur `Toabet` ne retourne aucun
lieu, et `Atong` retourne notamment `Atongo`. Google reste utile pour ses
coordonnées et ses `placeId`, mais ne peut pas corriger seul les usages locaux.

## Données persistées

Les annonces conservent :

- `cityPlaceId` et `districtPlaceId` ;
- le nom canonique affiché lors de la sélection ;
- les coordonnées ;
- `locationSource`, parmi `OFFICIAL_CATALOG`, `GOOGLE_PLACES`, `GPS`,
  `LEGACY` et `UNVERIFIED`.

Les identifiants du catalogue commencent par `catalog:`. Les anciennes
annonces restent modifiables avec la source `LEGACY`, afin de ne pas imposer une
migration bloquante.

## Alias et doublons

Un quartier administré possède un nom canonique et jusqu'à 20 alias. L'admin
les renseigne dans **Dashboard > Géolocalisation**, séparés par des virgules.
Exemple :

- nom canonique : `Atong-Abè` ;
- alias : `Toabet, Toabe, Atong Abe, Atong-Abe`.

La recherche normalise les accents, apostrophes, espaces et tirets. Elle filtre
ensuite strictement par province et par ville, puis fusionne les doublons ayant
le même nom canonique. Un dictionnaire local minimal couvre les alias critiques
pendant la transition, mais Firestore est la source administrable à privilégier.

## Flux public

1. L'utilisateur choisit l'une des 9 provinces.
2. Le catalogue est préchargé et mis en cache par le navigateur.
3. La ville est recherchée dans le catalogue et dans Google Places.
4. Le quartier est recherché dans la province et la ville sélectionnées.
5. Les résultats du catalogue apparaissent avant ceux de Google.
6. Le choix enregistre le nom canonique, l'identifiant et les coordonnées.

En développement, le fichier OSM local est préféré pour éviter l'attente d'un
service cloud. En production, la projection Firestore administrée reste
prioritaire. Ces comportements peuvent être forcés avec
`OSM_SELECTOR_PREFER_PROJECTION` et `OSM_STORAGE_PREFER_CLOUD`.

## Contrôles et tests

- `gabon-location-catalog.test.ts` vérifie l'alias `Toabet`, la canonisation et
  les homonymes Libreville/Oyem ;
- `location-picker.test.tsx` vérifie la persistance et l'invalidation après une
  retouche libre ;
- `property-builders-and-schemas.test.ts` vérifie le blocage des textes libres ;
- les tests Places vérifient les restrictions `GA`, `(cities)` et `(regions)`.

## Migration et audit

La migration est réexécutable et fonctionne en `dry-run` par défaut :

```bash
cd apps/location-maison
npm run location:migrate:dev
npm run location:migrate:dev:apply
```

Elle amorce la projection `geo_*` si nécessaire, ne fusionne que les doublons
de même portée situés à moins d'un kilomètre, et ne modifie jamais les annonces
historiques. Un second `dry-run` doit annoncer zéro fusion restante.

Les saisies sans résultat sont envoyées au pipeline analytics sous la source
`property_location_form`. Une même requête et son contexte ne sont envoyés
qu'une fois par période de 24 heures dans un navigateur.
