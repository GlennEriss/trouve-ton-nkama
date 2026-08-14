# Page de recherche

C'est le chantier le plus difficile du projet. Il mérite d'être attaqué en connaissant
précisément ce qui doit tomber.

## Aujourd'hui

`app/(public)/search/page.tsx` → `FilterProviders` → `SearchPageComponent` → `SearchDesktopPage`
/ `SearchMobilePage`.

**Correction (Lot 4) : `/search` n'embarque PAS de carte Google Maps.** Ma lecture initiale
listait `GoogleMapViewer`/`PropertyMarker`/`PropertyDetailsPanel`/`MapViewerModal` comme des
composants de cette page — faux : ce sont ceux de la route séparée `/map`
(`app/(public)/map`), un produit distinct. `SearchDesktopPage.tsx` est un layout deux colonnes
tout simple : `FilterSearchDesktopPageSection` (filtres) + une grille de résultats
(`useInfiniteHits` de `react-instantsearch`), sans aucune carte. `SearchMobilePage.tsx` est
équivalent (formulaire de recherche + grille). C'est une bonne nouvelle : ça retire d'un coup
le refactoring le plus lourd que ce document annonçait.

La vraie source de vérité de la requête n'est même pas `AlgoliaContext` (qui n'alimente que
l'état interne du **formulaire** de filtres) : c'est `FilterProviders.tsx`, qui lit l'URL
directement et appelle `useConfigure({ filters })` avec une chaîne construite par
`src/lib/search/search-filter-query.ts::buildPublicSearchFilters` — une fonction pure, sans
dépendance React, qui lit un objet `URLSearchParams`. C'est le point d'entrée le plus sûr pour
ajouter un filtre de catégorie : il est déjà couvert par un test unitaire dédié
(`__tests__/lib/search-filter-query.test.ts`).

Côté état : `AlgoliaContext`, `AlgoliaRefinementsContext`, `FormFilterSearchMediator`,
`useAlgoliaFacetOptions`, `useAlgoliaLocationOptions`.

Il reste une hypothèse structurelle réelle : **on filtre sur des attributs de bien** (surface,
type de bien, louer/vendre, tags immobiliers) — `FilterSearchDesktopPageSection.tsx` a ces
champs en dur. Pour un parfum ou une paire de chaussures, ces filtres ne s'appliquent
simplement pas ; ce n'est plus « le squelette de la page qui change de nature » (la carte
n'existait pas), c'est « le panneau de filtres contient des champs qui ne concernent qu'une
catégorie » — un problème plus circonscrit qu'annoncé.

## Décision : un squelette + des profils de recherche

Il n'y a pas *une* page recherche. Il y a **un squelette commun** et un **profil de recherche
porté par la catégorie**.

### Le squelette (identique pour toutes les catégories)

- Barre de requête texte
- Sélecteur de catégorie (avec « Toutes catégories »)
- Filtres du tronc commun : prix (min/max), ville, fraîcheur, état de l'annonce
- Tri, pagination, compteur de résultats
- Zone de résultats
- Emplacements sponsorisés intercalés (`SponsoredSlot`, `rotationIndex` — mécanisme existant,
  à conserver)

### Ce que la catégorie décide

| Paramètre sur `listing_categories` | Effet |
|---|---|
| `attributeSchema[].facetable` | Les filtres du panneau latéral sont **générés** à partir du schéma |
| `hasMapView` | Affiche ou non la vue carte (vrai pour Immobilier, faux pour Mode) |
| `locationPrecision` (`exact`/`city`/`none`) | Détermine si les filtres rue/quartier existent |
| `defaultSort` | Tri par défaut (immobilier : pertinence ; mode : plus récent) |
| `defaultDensity` | `standard` pour l'immobilier, `compact` pour la mode |
| `imageRatio` | Ratio de la grille en recherche mono-catégorie |

`hasMapView` reste une donnée utile pour piloter une éventuelle intégration future de `/map`
dans `/search` (ex. un onglet « Voir sur la carte » qui n'a de sens que pour l'immobilier),
mais ce n'est plus un refactoring de layout existant — `/search` n'a jamais eu de carte à
découpler. Non fait pour l'instant : hors périmètre du Lot 4.

## Stratégie d'indexation Algolia

Index unique : `location-maison_property-index` (`lib/algolia.ts`), avec
`ALGOLIA_BASE_FILTER = 'state:"IN_PROGRESS" AND moderationStatus:"APPROVED"'`.

**Décision : garder un index unique**, ne pas créer un index par catégorie.

Raison : un site de petites annonces doit pouvoir répondre à « tout ce qui contient *Nike* sur
la plateforme » et afficher un compteur de résultats par catégorie. Avec des index séparés, ça
devient une requête fédérée avec agrégation manuelle, pour un gain nul à ce volume.

### Aplatissement des attributs

Les attributs dynamiques sont indexés **à plat** au moment de l'indexation :

```
attributes: { taille: "M", marque: "Zara" }
        ↓  indexé comme
attr_taille: "M"
attr_marque: "Zara"
categoryPath.lvl0: "mode"
categoryPath.lvl1: "mode > vetements"
```

- `categoryPath.lvl0/lvl1` suit le format de **facette hiérarchique** Algolia, ce qui donne
  gratuitement l'arborescence de navigation et les compteurs par niveau.
- Les attributs numériques doivent être indexés **en nombre**, pas en chaîne, sinon les filtres
  d'intervalle (année, kilométrage, contenance) ne fonctionnent pas.

### Le piège : `attributesForFaceting` est de la configuration d'index

Ajouter un attribut facettable dans l'admin **ne suffit pas** : tant que la clé n'est pas
déclarée dans `attributesForFaceting` de l'index, la facette n'existe pas côté Algolia. Le
symptôme est déroutant — la donnée est bien en base, le filtre reste vide.

**À câbler dès le premier lot** : la sauvegarde d'une catégorie côté admin déclenche une
resynchronisation des settings d'index (opération serveur, clé d'admin Algolia, jamais côté
client). Dix lignes maintenant, deux jours de debug plus tard.

## Recherche sans catégorie (« Toutes catégories »)

C'est le mode par défaut quand l'utilisateur arrive depuis la barre du header.

- Filtres disponibles : **uniquement le tronc commun** (texte, prix, ville, fraîcheur). Aucun
  filtre d'attribut, puisqu'ils ne sont pas comparables entre catégories.
- Résultats : grille mixte, **ratio d'image unique imposé** (voir
  [01-direction-artistique.md](./01-direction-artistique.md)), densité `standard`.
- Au-dessus des résultats : une barre de compteurs par catégorie (« Immobilier 1 240 · Mode
  318 ») qui sert d'invitation à restreindre. C'est le principal mécanisme de découverte de la
  nouvelle catégorie par le trafic immobilier existant.

## URLs et SEO

- `/search?category=mode&attr_taille=M` pour la recherche applicative (non indexée).
- Les pages SEO existantes `/immobilier/[transaction]/[type]/[city]` **ne changent pas**.
- Les pages SEO de catégorie viendront plus tard (`/c/mode/vetements/libreville`), une fois le
  stock suffisant. Générer des pages indexables sur une catégorie quasi vide crée des pages de
  faible qualité qui pénalisent le domaine entier.

## Ce qu'on ne fait pas dans ce lot

- Pas de refonte de `search-with-ia` (recherche IA) : elle est calibrée immobilier, elle reste
  restreinte à l'immobilier jusqu'à nouvel ordre.
- Pas de suppression des providers existants (`AlgoliaContext`,
  `FormFilterSearchMediator`) : ils sont généralisés, pas remplacés.

## Points ouverts

1. **Vue carte : la garder en desktop pour l'immobilier uniquement, ou la passer partout en
   onglet secondaire ?** Recommandation : onglet, y compris en immobilier — ça uniformise la
   page et réduit le coût de maintenance de deux mises en page.
2. **Combien de filtres d'attributs afficher avant un « voir plus » ?** Le panneau ne doit pas
   devenir une liste de 15 sélecteurs. Proposition : 5 filtres marqués `primary` dans le
   schéma, le reste replié.
3. **Faut-il conserver les tags immobiliers** (`tags.json`, 33 entrées : Piscine, Meublé, Sous
   barrière…) comme un attribut de catégorie parmi d'autres, ou comme un mécanisme transverse ?
   Recommandation : les rapatrier dans `attributeSchema` de la catégorie Immobilier — c'est
   exactement ce qu'ils sont.
