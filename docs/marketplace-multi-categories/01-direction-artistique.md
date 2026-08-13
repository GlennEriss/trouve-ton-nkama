# Direction artistique et carte d'annonce

## Le conflit de fond

Un bien immobilier et un parfum ne se regardent pas de la même façon.

| | Immobilier | Mode |
|---|---|---|
| Nombre d'objets vus avant décision | 5 à 20 | 50 à 300 |
| Temps passé par objet | Long, on lit | Une demi-seconde, on balaie |
| Ce qui décide | Prix, localisation, surface | **L'image**, puis le prix |
| Prix | 150 000 – plusieurs millions | 3 000 – 80 000 F |
| Photo native | Paysage | Portrait ou carré |

La carte actuelle (`PropertyCard`, `min-h-[500px]`) est cohérente avec la colonne de gauche :
grande, aérée, beaucoup de texte, peu d'unités à l'écran. Appliquée à la mode, elle donne une
page où l'on voit six articles et où il faut scroller quarante fois — c'est-à-dire l'inverse de
ce qu'un site de petites annonces doit produire.

**Mais** faire deux designs séparés est un piège : le jour où une recherche mélange les
catégories (« tout ce qui est neuf à Libreville »), une grille à deux designs devient illisible.

## Décision : une carte, trois densités, un slot variable

Un seul composant `ListingCard`. Ce qui varie est **paramétré**, pas dupliqué.

### Les trois densités

| Densité | Usage | Cartes par ligne (desktop) |
|---|---|---|
| `showcase` | Section mise en avant sur l'accueil, sponsorisé | 3 |
| `standard` | Recherche immobilier, rails d'accueil | 4 |
| `compact` | Recherche mode / véhicules, grilles à fort volume | 6 (mobile : 2) |

La densité est un attribut de **contexte d'affichage**, pas de catégorie : une annonce mode
mise en avant s'affiche en `showcase`, une annonce immobilière dans une grille dense s'affiche
en `compact`. Ça évite qu'une grille mixte se déforme.

### Anatomie commune

```
┌─────────────────────────┐
│  [badge catégorie]   ♥  │   ← image, ratio imposé par la grille
│                         │
├─────────────────────────┤
│ Titre sur deux lignes…  │   ← line-clamp-2, hauteur fluide (pas min-h fixe)
│ 25 000 F CFA            │   ← prix, toujours au même endroit
│ ▸ ligne de contexte     │   ← SLOT variable selon la catégorie
│ Libreville · il y a 2 j │   ← lieu (ville seule) + fraîcheur
└─────────────────────────┘
```

Le **slot de contexte** est la seule zone dont le contenu dépend de la catégorie, et il est
alimenté par le schéma d'attributs (champs marqués `showOnCard`, 2 ou 3 maximum) :

| Catégorie | Slot |
|---|---|
| Immobilier | `3 ch · 2 sdb · 90 m²` |
| Vêtements | `Taille M · Zara · Très bon état` |
| Parfums | `100 ml · Neuf sous blister` |
| Véhicules | `2015 · 120 000 km · Diesel` |

Les badges de confiance existants (**Propriétaire direct**, **Numéro vérifié**) restent, mais
en `compact` ils se réduisent à une pastille icône — le libellé « Propriétaire direct » n'a de
sens qu'en immobilier et devra devenir un libellé porté par la catégorie.

### Ratio d'image : la règle qui évite le chaos

**Le ratio est imposé par la grille, pas par l'annonce.** Une grille mixte impose un ratio
unique à toutes ses cartes (4:3), une grille mono-catégorie prend le ratio natif de la
catégorie (`imageRatio` sur `listing_categories` : `4:3` immobilier, `1:1` mode, `4:3`
véhicules). Sans cette règle, une grille alternant portraits et paysages produit une ligne de
crénelage visuel immédiatement perçu comme « pas fini ».

### Hauteurs fixes : à supprimer

La carte actuelle empile `min-h-[68px]`, `min-h-[44px]`, `min-h-[50px]` pour aligner les blocs.
En `compact`, ces valeurs représentent plus que l'espace disponible. L'alignement doit passer
par une grille CSS à lignes définies (`grid-template-rows`), pas par des hauteurs minimales
codées en dur.

## Favoris

**Correction (Lot 1) : le système de favoris existe déjà** — ma recherche initiale l'avait
manqué (défaut de recherche, pas absence réelle). En production : `favoris: string[]` sur le
document utilisateur (`models/authentication.d.ts`), bouton `ButtonFavoris.tsx` (icône cœur,
`react-icons` `RiHeart3Line`) sur la fiche annonce, page `/favoris` (`SectionFavoris.tsx`),
entrées navbar/bottom-nav.

Bonne nouvelle pour le chantier : c'est un tableau générique d'identifiants d'annonces, pas un
champ typé immobilier — il **fonctionnera pour la mode sans modification**, dès que le bouton
est monté sur la fiche générique (Lot 6).

Deux limites réelles à connaître, pas urgentes mais à garder en tête :

- Le bouton ne s'affiche pas pour un visiteur non connecté (`if (!user) return null`) — pas de
  geste de favori avant inscription. Cohérent avec le reste du produit (contact/promotion
  exigent déjà un compte), mais c'est la friction n°1 si on veut un jour maximiser la rétention
  d'un visiteur mode non inscrit.
- Le toggle réécrit l'utilisateur entier (`updateUser(uid, {...user, favoris})`) plutôt qu'une
  opération atomique (`arrayUnion`/`arrayRemove`) — pas un problème à ce volume, à surveiller si
  le taux de clic favori augmente beaucoup avec la mode (risque de writes concurrents qui
  s'écrasent).
- Il n'y a pas de compteur agrégé sur l'annonce (`favoriteCount`). Utile pour la preuve sociale
  et pour justifier une promotion (voir [06-monetisation.md](./06-monetisation.md)) — mais c'est
  un ajout, pas une reconstruction. Piste V1, pas bloquant pour ouvrir la mode.

## Dette technique à traiter avant de densifier

`PropertyCard` fait un `fetch('/api/property/id?id=…')` **par carte** pour résoudre
`isDirectOwner`. Une grille `compact` affiche 3 à 4 fois plus de cartes qu'aujourd'hui : le
nombre d'appels suit. `isDirectOwner` doit être **indexé dans Algolia** et lu avec le reste du
hit, et le fetch de rattrapage supprimé. À faire dans le même lot que la carte, pas après.

## Ce qu'on ne change pas

- **L'identité de marque** : palette, logo, typographies restent. Le chantier est une
  **réhabilitation de densité et de hiérarchie**, pas un rebranding. Changer l'apparence
  générale en même temps qu'on change le périmètre rendrait impossible d'attribuer une baisse
  de conversion à l'une ou l'autre cause.
- Les composants de confiance (badges) et le parcours de contact WhatsApp/appel.

## Points ouverts

1. **Ratio mode : carré (1:1) ou portrait (4:5) ?** Le portrait montre mieux un vêtement porté,
   le carré s'aligne mieux avec l'immobilier dans les grilles mixtes. Recommandation : **1:1**,
   pour la cohérence transverse.
2. **Le prix barré / négociable** : la mode d'occasion se négocie beaucoup. Faut-il un drapeau
   « prix négociable » sur la carte ? Recommandation : oui, attribut commun, pas un attribut de
   catégorie.
3. **Densité par défaut sur mobile pour la mode** : 2 colonnes (façon Vinted) ou 1 ? À trancher
   sur maquette.
