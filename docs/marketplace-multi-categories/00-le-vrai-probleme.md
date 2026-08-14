# Le vrai problème

## La thèse

L'immobilier n'est pas *une catégorie* dans Trouve Ton Nkama. C'est **l'axe structurant de
toutes les couches du produit** : le modèle de données, le formulaire, la carte, l'accueil, la
recherche, la fiche, les URLs. Il n'existe nulle part un endroit où le produit dit « ceci est
une annonce » sans dire du même geste « ceci est un bien immobilier ».

Conséquence : ajouter la mode n'est pas un ajout, c'est une **extraction**. Il faut d'abord
faire apparaître la notion d'annonce générique là où il n'y a aujourd'hui que du bien
immobilier — puis raccrocher l'immobilier à cette notion comme un cas particulier.

C'est aussi pour ça que le chantier est faisable : il ne s'agit pas de réécrire, mais de
remonter d'un cran le niveau d'abstraction de choses qui fonctionnent déjà.

## Inventaire du couplage, couche par couche

### 1. Modèle de données — couplage moyen

`src/models/annonce.d.ts` : `Property` porte `typeProperty`, `area`, `status:
"FOR_RENT" | "FOR_SALE"`, et étend `Location` où `longitude`/`latitude`/`street`/`province` sont
**obligatoires**.

Le tronc réellement générique existe déjà et est sain : `title`, `description`, `price`,
`images`, `contact`, `moderationStatus`, `state`, `currentPromotion`, `createdBy`, `claimedBy`,
`giftCount`. Il fonctionne tel quel pour n'importe quelle catégorie.

**Difficulté : mécanique.** Ajout de `categoryId`/`categoryPath`/`attributes`, backfill.

### 2. Formulaire de publication — **point de rupture n°1**

`src/builders/property-form/` contient **14 builders** : `apartment`, `building`, `desk`,
`duplex`, `home`, `kiosk`, `land`, `logement`, `property`, `room`, `shop`, `studio`, `villa`,
`warehouse`. Chacun a son composant miroir (`components/home/FormHome.tsx`,
`components/villa/FormVilla.tsx`, `components/land/FormLand.tsx`…).

Le pattern est un Builder abstrait (`PropertyFormBuilder`) dont chaque type de bien dérive en
composant une liste de `FormElement` répartis en étapes.

C'est l'architecture qui coûte le plus cher à étendre : **un type = un fichier builder + un
composant formulaire**. Mode seule ajouterait 4 couples. Véhicules 3 de plus. La combinatoire
n'est pas tenable, et surtout elle est inutile : les catégories ne diffèrent que par une liste
de champs, ce qui est de la **donnée**, pas du code.

**Difficulté : structurelle.** Le pattern doit être remplacé par un moteur piloté par schéma —
voir [05-publication-et-reels.md](./05-publication-et-reels.md).

### 3. Recherche — **point de rupture n°2**

`components/search/` : `SearchDesktopPage`, `SearchMobilePage`, `GoogleMapViewer`,
`PropertyMarker`, `MapViewerModal`, `SelectProvince`, `SelectCity`, `SelectStreet`,
`LocationFiltersDropdown`.

La page entière est bâtie autour de deux hypothèses : **on cherche dans l'espace** (carte
Google Maps, marqueurs, hiérarchie province → ville → rue) et **on filtre sur des critères de
bien** (surface, type, louer/vendre).

Pour un parfum, la carte n'a aucun sens et la hiérarchie d'adresse non plus. Ce n'est pas un
filtre à masquer : c'est le squelette de la page qui change de nature.

**Difficulté : structurelle.** Voir [03-page-recherche.md](./03-page-recherche.md).

### 4. Carte d'annonce — couplage fort mais superficiel

`components/home-page/PropertyCard.tsx` : hauteur figée `min-h-[500px]`, image 220–240 px,
blocs à hauteur fixe (`min-h-[68px]` titre, `min-h-[44px]` prix, `min-h-[50px]` adresse),
libellé `TypeProperty[property.typeProperty]`, prix rendu en
`status === "FOR_RENT" ? "À louer" : "À vendre"`, adresse `city, province, street`, icônes
chambres / salles de bain / surface.

**Point d'attention technique** : la carte déclenche un `fetch('/api/property/id?id=…')` **par
carte** pour résoudre `isDirectOwner` (avec un cache mémoire `directOwnerCache`). Aujourd'hui,
avec de grosses cartes, une grille en contient peu. En densifiant façon petites annonces, on
multiplie mécaniquement ces appels. **Ce fetch doit disparaître avant toute densification** —
la donnée doit venir de l'index Algolia avec le reste.

**Difficulté : mécanique**, une fois la direction artistique tranchée.

### 5. Accueil — couplage fort

`HomePageDesktopComponent` enchaîne `FeaturedSection`, `CarouselPropertyType`,
`TrendingSection`, `RecentSection`, `PropertyByProvince`, puis des liens SEO
`/immobilier/location/maison`, `/immobilier/vente/maison`…

Les deux axes de navigation de l'accueil sont **le type de bien** et **la province**
(`constantes/home-page.ts` : `HOME_PROPERTY_TYPE_KEYS`, `HOME_PROVINCES`). Aucun des deux ne
sert la mode.

**Difficulté : produit** — c'est une question de hiérarchie éditoriale avant d'être une question
de code. Voir [02-page-accueil.md](./02-page-accueil.md).

### 6. Fiche détail et URLs — dette de nommage

Route `/houseDetails/[id]`, composant `components/preview-property/HouseDetails`. Le chemin
public lui-même dit « maison ». Ces URLs sont indexées et partagées sur WhatsApp/Facebook
depuis des mois : elles ne peuvent pas être cassées.

**Difficulté : mécanique, mais irréversible si mal faite.** Voir
[04-page-detail.md](./04-page-detail.md).

### 7. Réels — bonne nouvelle

Contrairement au reste, les réels sont **déjà découplés** : `models/reel.d.ts` déclare
`propertyId?: string | null` et `CreateOrphanReelClient` permet de créer un réel sans annonce.
Le contact, la description et la modération vivent sur le réel lui-même.

**Difficulté : faible.** Il manque essentiellement un axe catégorie pour filtrer le feed.

### 8. Ce qui traverse sans effort

Modération (`moderationStatus`), notifications, crédits/paiement (MyPayGa, Airtel), cadeaux,
publicité (`SponsoredSlot`, module `advertising`), revendication d'annonce par téléphone
(`claimedBy`), RBAC admin. Ces briques sont agnostiques de la catégorie et se réutilisent
telles quelles.

## Récapitulatif

| Couche | Couplage | Difficulté | Lot |
|---|---|---|---|
| Modèle de données | Moyen | Mécanique | 1 |
| Formulaire de publication | **Très fort** | **Structurelle** | 7 |
| Recherche | **Très fort** | **Structurelle** | 4 |
| Carte d'annonce | Fort | Mécanique | 3 |
| Accueil | Fort | Produit | 5 |
| Fiche détail / URLs | Moyen | Mécanique (irréversible) | 6 |
| Réels | Faible | Faible | 9 |
| Modération, crédits, pub, notifs | Nul | — | — |

## La question qu'il faut se poser avant tout le reste

**Comment les premières annonces mode entrent-elles dans la plateforme ?**

Aujourd'hui, l'essentiel de l'offre immobilière est **saisie par l'admin** (import Apify,
back-office), pas par les annonceurs eux-mêmes. Si ce mode d'amorçage vaut aussi pour la mode,
alors le formulaire public — le point de rupture n°1, le plus coûteux — **n'est pas sur le
chemin critique du lancement**. On peut ouvrir la catégorie avec une saisie admin et ne
construire le moteur de formulaire public qu'une fois la demande prouvée.

C'est l'hypothèse retenue dans [07-lots-et-sequencement.md](./07-lots-et-sequencement.md), et
elle réduit le risque du chantier plus que n'importe quel choix technique.
