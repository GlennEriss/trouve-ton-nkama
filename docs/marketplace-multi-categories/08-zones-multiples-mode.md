# Zones multiples pour les annonces hors immobilier (Mode, etc.)

**Demande directe de l'utilisateur (2026-09-11)**, sur la page
`/category-listing/create/preview/TpsedOivEXVxmRyfNwRa` : « les vendeurs me disent qu'ils
vendent souvent par zone, par exemple ils peuvent vendre sur Libreville et Franceville, ou sur
3 ou 4 zones. Mais nous on ne met qu'une zone ». Objectif : permettre à une annonce Mode
(et toute catégorie future avec `locationPrecision: "city"`) de déclarer **plusieurs villes**,
sans rien casser côté immobilier ni côté annonces déjà publiées.

Ce document est l'analyse + la proposition d'architecture. Il complète
[00-le-vrai-probleme.md](./00-le-vrai-probleme.md) et
[05-publication-et-reels.md](./05-publication-et-reels.md), qui posaient déjà
`locationPrecision: "city"` pour Mode — cette analyse va plus loin : **combien** de villes,
pas seulement lesquelles.

## État d'avancement — ✅ implémenté (2026-09-11)

Toutes les décisions §9 ont été tranchées avec les valeurs recommandées (max 5 zones,
troncature "+N" au-delà de 2 sauf sur la fiche détail, pas de validation contre un
catalogue, web puis admin, backfill différé/optionnel, pas de flag dédié par catégorie).

**Livré, dans le même monorepo (web `location-maison`, mobile `apps/mobile`, back-office
`location-maison-admin`)** :
`src/models/annonce.d.ts` (`LocationZone`, `Property.zones/cities/provinces`),
`src/lib/listing-zones.ts` (+ tests), prompt/parseur IA (`ai-category-listing.service.ts`,
`cities: string[]`, tolère l'ancien format), page de création, `EditableZonesField.tsx`
(nouveau), `PreviewCategoryListingDraft.tsx`, `PreviewCategoryListing.tsx` (chips), JSON-LD
`areaServed` (tableau), `listing-share.ts`, `ListingCard.tsx` + `AdManagementPage.tsx`
(déduplication dans un helper commun, immobilier et zone unique strictement inchangés),
`useAlgoliaLocationOptions.ts` + `search-filter-query.ts` (`cities` hors scope immobilier),
extension Algolia (`FIELDS=...,cities,provinces`, **pas encore redéployée**), mobile
(`api/algolia.ts`, `api/property.ts`, `PropertyCard.tsx`, `ListingDetailScreen.tsx`,
`FavorisScreen.tsx`, `MyListingsScreen.tsx`), admin (`domain/zones.ts`,
`category-listing.service.ts`, `category-listing.repository.ts`, route API, formulaire
`category-listings/new`), script de backfill optionnel (`scripts/backfill-listing-zones.js`,
**pas exécuté**), extension du spec e2e réel
(`__tests__/e2e/property-and-mode-creation.spec.ts`, **pas encore exécuté**).

**Vérifié** : `tsc --noEmit` propre sur les 3 apps ; Jest — web 244/244 suites (1676 tests,
dont les nouveaux `listing-zones.test.ts`, `listing-share.test.ts`, extensions de
`ai-category-listing.service.test.ts`/`search-filter-query.test.ts`/
`algolia-search-route.test.ts`/`seo-algolia-listings.test.ts`), mobile 36/36 (174 tests, dont
le nouveau `listingZones.test.ts`). Admin : pas de harness Jest dans ce dépôt, rien à lancer.

**Restant, hors code** : redéployer l'extension Firebase `firestore-algolia-search` (le
`.env` est modifié mais pas poussé) pour que `cities`/`provinces` soient réellement indexés ;
lancer les specs e2e sur un environnement réel ; lancer le backfill (optionnel) sur les
annonces existantes si on veut les rendre immédiatement trouvables par zone secondaire.

---

## 1. Pourquoi une seule zone aujourd'hui — l'état des lieux exact

### 1.1 Le modèle de données est unique pour tout le catalogue

`Property = Location & ICreation & {...}` ([src/models/annonce.d.ts](../../apps/location-maison/src/models/annonce.d.ts))
et `Location` impose un **point unique** : `street`, `city`, `province`, `latitude`,
`longitude`. Immobilier ET Mode partagent la même collection Firestore `properties` et le
même type — logique pour une maison (une adresse), pas pour un vendeur ambulant.

### 1.2 Quatre chemins de création écrivent aujourd'hui une seule ville — deux dépôts

| # | Chemin | Fichier | Ville | Province |
|---|---|---|---|---|
| 1 | Web, IA (`/category-listing/create`) | [category-listing/create/page.tsx](../../apps/location-maison/src/app/(protected)/category-listing/create/page.tsx) | extraite par Gemini (`draft.city: string \| null`) | **codée en dur** : `GABON_PROVINCES[0]` — jamais déduite |
| 2 | Web, IA — prompt/parsing | [ai-category-listing.service.ts](../../apps/location-maison/src/services/ai-category-listing.service.ts) | `"city": "string ou null"` dans le contrat JSON | — |
| 3 | Admin back-office, formulaire manuel | `location-maison-admin/src/app/(admin)/dashboard/category-listings/new/page.tsx` | `useState<string>` | `useState(GABON_PROVINCES[0].name)` |
| 4 | Admin back-office, service | `location-maison-admin/src/modules/category-listing/application/category-listing.service.ts` + `domain/types.ts` | `city: string`, validé 2–80 car. | `province: string`, résolu via `getProvinceByName` |

Le chemin Apify (import automatisé) mentionné dans `[[project-apify-module]]` est **différent** — sa
persistance Firestore/Storage est explicitement reportée (mémoire projet) — donc **hors
périmètre immédiat**, mais devra suivre le même modèle le jour où il est branché.

### 1.3 L'équipe a déjà contourné le problème une fois, partiellement

[useAlgoliaLocationOptions.ts](../../apps/location-maison/src/hooks/useAlgoliaLocationOptions.ts)
contient déjà ce commentaire : « Une annonce Mode a `province` codée en dur à la création...
la cascade Province → Ville habituelle bloquerait le sélecteur Ville » — d'où
`useAlgoliaCityOptions` sans filtre province, dédié à Mode. C'est le même symptôme que la
demande d'aujourd'hui : **`province`/`city` singuliers ne collent pas au réel d'un vendeur
Mode**, la mitigation existante ne traitait que la province, pas la multiplicité des villes.

---

## 2. Invariant de conception : l'immobilier n'est jamais touché

**Aucun champ, composant ou requête propre à l'immobilier ne change.** La distinction déjà
présente dans le code — `locationPrecision: "exact"` (immobilier) vs `"city"` (Mode,
Véhicules...) — devient la frontière stricte :

- `locationPrecision === "exact"` → **toujours 1 seule zone**, adresse précise, comportement
  actuel à 100 %, code immobilier non touché.
- `locationPrecision === "city"` → **1 à N zones**, c'est tout le périmètre de ce document.

Chaque section ci-dessous précise explicitement ce qui reste identique pour l'immobilier.

---

## 3. Modèle de données proposé

### 3.1 Nouveau champ `zones`, champs existants conservés en rétrocompatibilité

```ts
export type LocationZone = {
  city: string
  province: string
  latitude: number
  longitude: number
}

export type Property = Location & ICreation & {
  // ... inchangé ...

  // Zones multiples (Lot zones-multiples) : présent uniquement pour les catégories
  // locationPrecision === "city". Absent sur toute annonce immobilière et sur toute
  // annonce Mode créée avant ce chantier (backfill optionnel, voir §7).
  zones?: LocationZone[]

  // Dénormalisation dédiée à Algolia (facettes/filtres sur un tableau, voir §5) —
  // dérivée de `zones`, jamais éditée directement. Même idée que `tags: TagName[]`,
  // déjà un tableau facetable aujourd'hui.
  cities?: string[]
  provinces?: string[]
}
```

`city`/`province`/`latitude`/`longitude` **restent tels quels** sur `Property` et sont
toujours renseignés — avec la **zone primaire** (`zones[0]`). C'est ce qui garantit que
tout code qui lit encore `property.city` (string) continue de fonctionner sans modification :
il voit simplement « la » ville, comme avant, la première de la liste.

**Pourquoi pas remplacer `city`/`province` par un tableau directement ?** Parce que des
dizaines de points de lecture les traitent comme des `string` (JSON-LD, ciblage pub, partage
social, recommandations, immobilier entier...) — les changer en tableau serait une rupture
de type silencieuse partout. Ajouter `zones` à côté, sur le modèle déjà utilisé pour
`categoryId`/`categoryPath`/`attributes` (« optionnels tant que non renseignés », même
commentaire dans `annonce.d.ts`), est le seul chemin qui ne casse rien.

### 3.2 Pourquoi une dénormalisation `cities`/`provinces` séparée de `zones`

L'extension Firebase `algolia/firestore-algolia-search` (voir
`apps/location-maison/extensions/firestore-algolia-search.env`, `FIELDS=...`) recopie des
champs Firestore **tels quels** vers Algolia, sans transformation. Un tableau d'objets
(`zones: [{city, province, ...}]`) n'est pas facetable proprement côté Algolia (facette sur
un sous-champ d'objet imbriqué dans un tableau = mauvaise expérience, pas testé par
l'extension). Un tableau de **chaînes** (`cities: string[]`) l'est nativement — exactement
comme `tags` aujourd'hui (déjà un `string[]`, déjà facetable, déjà utilisé par
`useRefinementList({attribute:"tags"})`). Donc : `cities`/`provinces` sont deux tableaux
plats, recalculés à chaque écriture de `zones`, ajoutés à `FIELDS=` de l'extension — zéro
nouveau code d'indexation, réutilisation d'un mécanisme qui tourne déjà en production.

### 3.3 Le catalogue restauré ou non ?

Aujourd'hui, `draft.city` (IA) et le formulaire admin ne sont validés contre **aucun**
catalogue de villes (contrairement à l'immobilier, qui utilise `LocationPicker` + Google
Places/OSM). Ce n'est pas une régression introduite ici — c'est déjà l'état actuel. Deux
options, à trancher en §9 :
- garder ce niveau de rigueur (texte libre, tolérant) pour chaque zone ;
- ou valider chaque ville extraite contre `GABON_PROVINCES`/le catalogue de
  `packages/core/src/domain/gabon-locations.ts`, en silence-droppant celles qui ne
  correspondent à rien de connu (durcissement optionnel, pas un blocage).

---

## 4. Impact détaillé, page par page

### 4.1 Création — `/category-listing/create`

| Élément | Aujourd'hui | Proposition |
|---|---|---|
| Prompt IA (`buildCategoryListingDraftPrompt`) | `"city": "string ou null"`, consigne « n'invente jamais une ville » | `"cities": ["string", ...]` — consigne : lister **toutes** les villes mentionnées, dédupliquées, `[]` si aucune, jamais en inventer |
| Parsing (`parseCategoryListingDraftResponse`) | `city: string \| null` | `cities: string[]` — trim, dédup insensible à la casse, plafonné (proposition : 5 zones max), tolère en plus une réponse `"city": "X"` isolée (Gemini peut continuer à répondre à l'ancien format malgré le prompt — défense en profondeur, même esprit que `coerceToNumber` déjà présent dans ce fichier pour les prix) |
| `page.tsx`, construction du payload | `city: draft.city ?? ''`, `province: provinceMeta.name` (1 seule fois) | `zones: draft.cities.map(city => ({ city, province: provinceMeta.name, latitude: provinceMeta.lat, longitude: provinceMeta.lng }))`, puis `city/province/latitude/longitude = zones[0]` (rétrocompat), `cities`/`provinces` dénormalisés |
| Si `draft.cities` vide | `city: ''` (annonce sans ville, corrigible en preview) | `zones: []` — même filet de rattrapage, corrigible en preview (§4.2) |

Ce fichier vit dans **location-maison** (dépôt web).

### 4.2 Édition brouillon — `/category-listing/create/preview/[id]` (l'URL citée par l'utilisateur)

[PreviewCategoryListingDraft.tsx](../../apps/location-maison/src/components/preview-property/PreviewCategoryListingDraft.tsx)
a aujourd'hui un bloc « Localisation » avec deux `EditableField` (Ville, Province) en
lecture/écriture simple. `EditableField` documente lui-même sa limite : « compound fields
(location, tags...) get their own dedicated editors instead of being forced through this
one » — donc un nouveau composant, pas une extension de celui-ci.

**Proposition** : `EditableZonesField` — liste de puces (« Libreville ✕ », « Franceville ✕ »)
+ un champ d'ajout (saisie + Entrée, ou suggestion depuis le catalogue si §3.3 tranche pour la
validation). `onSave` appelle `saveField({ zones, city: zones[0]?.city ?? '', province:
zones[0]?.province ?? '', cities: zones.map(z => z.city), provinces: [...new Set(zones.map(z
=> z.province))] })` — même mécanique `updateProperty` existante, même remise en `PENDING`
après rejet (comportement déjà en place, inchangé).

### 4.3 Admin back-office — formulaire manuel + service

`location-maison-admin/src/app/(admin)/dashboard/category-listings/new/page.tsx` (deux
`useState` ville/province) et
`location-maison-admin/src/modules/category-listing/application/category-listing.service.ts`
(`CreateCategoryListingInput.city: string`, validation 2–80 caractères) suivent le même
changement : `cities: string[]` en entrée (UI : liste de puces, comme §4.2), validation « au
moins 1, au plus N, chacune 2–80 caractères », construction de `zones`/`cities`/`provinces`
dans `createCategoryListingDocument`. Ce chemin vit dans **location-maison-admin** (dépôt
séparé) — à traiter dans le même lot que §4.1/§4.2 pour ne pas laisser un chemin de création
en retard sur l'autre.

### 4.4 Fiche détail publique — `/annonce/[id]` (ex. `/annonce/mock-accessoires-1`)

[PreviewCategoryListing.tsx](../../apps/location-maison/src/components/preview-property/PreviewCategoryListing.tsx)
affiche aujourd'hui une puce unique `<MapPin/> {property.city}`. Devient : une puce par zone
(ou puce groupée « Libreville +2 » au-delà de 2, au clic/hover la liste complète — à trancher
en §9 selon l'espace disponible sur mobile). Nouvelle fonction utilitaire partagée (voir
§4.6) plutôt qu'un nouveau bout de logique dans ce composant.

**JSON-LD** ([annonce/[id]/page.tsx](../../apps/location-maison/src/app/(public)/annonce/[id]/page.tsx)) :
`categoryStructuredData.offers.areaServed` passe de `{'@type':'City', name: property.city}`
(un objet) à un **tableau** `zones.map(z => ({'@type':'City', name: z.city}))` —
`areaServed` accepte nativement un tableau en schema.org, changement mécanique. La branche
immobilier (`realEstateStructuredData`, `addressLocality`/`addressRegion`) **n'est pas
touchée** : elle continue de lire `property.city`/`property.province` singuliers.

### 4.5 Grilles d'annonces — accueil, recherche, favoris, `/property?submitted=1`

[ListingCard.tsx](../../apps/location-maison/src/components/listing/ListingCard.tsx),
densité `compact` (celle utilisée pour Mode, voir commentaire dans le fichier) :
`locationLabel = [property.street, property.city, property.province].filter(Boolean).join(",
")`. Devient, pour une annonce avec `zones` : label basé sur les villes (street reste
pertinent seulement pour l'immobilier, qui n'a pas de `zones`). Contrainte à respecter :
**la hauteur de carte doit rester uniforme** (contrainte déjà documentée dans ce fichier) —
donc troncature à 1–2 zones affichées + suffixe « +N », jamais une liste qui déborde.

`/property?submitted=1` (page « Gestion des annonces »,
[AdManagementPage.tsx](../../apps/location-maison/src/features/announcer/ad-management/ui/v1/AdManagementPage.tsx))
utilise `ListingCard` pour son onglet Mode — même correctif, gratuit une fois le composant
partagé introduit (§4.6). `AdManagementPage.tsx` a par ailleurs **sa propre** fonction
`formatLocation` qui duplique exactement la même logique (commentaire du fichier : « même
logique que ListingCard.tsx ») — l'occasion de la faire pointer vers le même helper au lieu
de maintenir deux copies (nettoyage, pas une obligation du chantier).

### 4.6 Nouvelle fonction utilitaire partagée

`src/lib/listing-zones.ts` (nouveau, location-maison) — évite de dupliquer la logique
d'affichage une troisième fois (déjà dupliquée deux fois aujourd'hui, §4.5) :

```ts
export function getListingZones(property: Pick<Property, 'zones' | 'city' | 'province'>): LocationZone[]
// zones si présent et non vide, sinon [{city, province, ...}] à partir des champs
// singuliers (annonces pré-migration, voir §7) — TOUJOURS au moins 1 élément si city existe.

export function formatZonesLabel(zones: LocationZone[], opts?: { max?: number }): string
// "Libreville" / "Libreville, Franceville" / "Libreville, Franceville +2"
```

Consommé par `ListingCard.tsx`, `AdManagementPage.tsx`, `PreviewCategoryListing.tsx`, et
`listing-share.ts` (§4.7).

### 4.7 Partage social — OG title/description

[listing-share.ts](../../apps/location-maison/src/lib/seo/listing-share.ts),
`getListingLocationLabel` : aujourd'hui `[street, city].filter(Boolean).join(', ')`,
utilisé par `buildListingShareTitle` (og:title WhatsApp/Facebook) et par
`/api/og/property/[id]/route.tsx` (bandeau prix/quartier de l'image générée). Pour une
annonce avec `zones`, bascule sur `formatZonesLabel` (§4.6) au lieu de `street`+`city` (Mode
n'a pas de `street`). L'immobilier garde exactement `street, city` — non concerné (pas de
`zones`).

### 4.8 Ciblage publicitaire — `SponsoredSlot`

Reçoit aujourd'hui `province`/`city` singuliers (`HouseDetails.tsx` →
`SponsoredSlot`). **Proposition : ne pas changer** — continuer de cibler sur la zone
primaire (`zones[0]`). Cibler l'union de toutes les zones demanderait de changer la logique
de sélection de campagne pub (hors périmètre, aucun vendeur ne s'est plaint du ciblage pub) ;
la zone primaire reste un proxy raisonnable. À revisiter seulement si constaté insuffisant.

### 4.9 Ce qui n'est PAS impacté (vérifié, pas supposé)

- **`RecommendationSection.tsx`** : passe déjà `location: currentCategoryId ? undefined :
  currentPropertyLocation` — la localisation n'entre **déjà pas** en compte pour les
  recommandations d'une annonce catégorisée (Mode). Zéro changement.
- **`firestore.rules`** : aucune contrainte de type sur `city`/`province` sur la collection
  `properties` — un tableau `zones` ne viole aucune règle existante.
- **`property.db.ts` / `PATCH /api/property/[id]`** : écriture Firestore générique, sans
  schéma Zod, seuls `createdBy`/`claimedBy`/`id`/`currentPromotion` sont protégés — `zones`
  patchable sans changement serveur.
- **App mobile** (`apps/mobile`) : ne propose **aucune création** d'annonce Mode
  aujourd'hui (recherché : seuls `SearchScreen`/`api/algolia.ts` référencent `categoryId`,
  en lecture/recherche). Impact mobile limité à la recherche/l'affichage (§5), pas à un
  formulaire de création à modifier.
- **14 builders immobilier** (`src/builders/property-form/`), leurs composants `Form*.tsx`,
  `models/schema.ts` (les `z.object` avec `city`/`province` y sont tous immobilier) : zéro
  changement, zéro nouveau champ.

---

## 5. Impact recherche & Algolia

| Point | Aujourd'hui | Proposition |
|---|---|---|
| Extension `firestore-algolia-search` | `FIELDS=...,city,...` (voir `extensions/firestore-algolia-search.env`) | Ajouter `cities,provinces` à `FIELDS=` — aucun code d'indexeur à écrire, le mécanisme existant pour `tags` s'applique tel quel |
| `useAlgoliaLocationOptions.ts` (cascade Province→Ville, `useAlgoliaCityOptions` sans province pour Mode) | Facette sur `city` (singulier) | Pour le scope Mode : facette sur `cities` — une annonce à 3 zones apparaît dans les 3 compteurs, comportement attendu |
| `SelectCityModeScope.tsx` (sélecteur de ville pour un **chercheur** en scope Mode) | Sélection simple d'une ville, filtre `city:"X"` | Reste une sélection simple côté chercheur (chercher "à Libreville" reste une action à une ville) — seul le filtre change de champ : `cities:"X"` au lieu de `city:"X"`. **Aucun changement UX pour le chercheur.** |
| `search-filter-query.ts` (web, construit la chaîne `filters` pour `/search`) | Mappe `city`→`city` | Pour une requête scope Mode : mapper vers `cities`. Immobilier : `city` inchangé. Même branchement que celui déjà présent dans ce fichier pour `province`/`street`/`typeProperty` (liste `IMMOBILIER_ONLY_PARAMS`) |
| Mobile, `apps/mobile/src/api/algolia.ts`, `buildFilters` | `isImmobilierScope && filters.city` inexistant aujourd'hui — `city` appliqué inconditionnellement (`if (filters.city?.trim()) clauses.push('city:"..."')`) | Ajouter la même bascule que celle déjà en place pour `typeProperty`/`status`/`province` dans ce fichier : `isImmobilierScope ? city:"X" : cities:"X"` |
| Assistant recherche IA (`/api/ai-search/chat`) | Extrait une ville du message utilisateur (`city?: string`), l'injecte dans le filtre de recherche existant | Aucun changement de logique IA — l'extraction reste « une ville par message », c'est le filtre en aval (ligne précédente) qui sait déjà chercher sur `cities` pour Mode. Pas de double travail. |
| Une requête Algolia facturée en plus ? | — | Non : `cities` remplace `city` dans le même appel, ne l'ajoute pas — aucun impact sur `docs/location-maison/setup/ALGOLIA-QUOTA-FAILOVER.md` |

**Important — pourquoi `city:"X"` continue de marcher sur un attribut tableau sans rien
changer côté Algolia** : Algolia traite nativement un attribut `string[]` comme
« correspond si une des valeurs égale X » pour un filtre `attribut:"X"`, exactement comme il
le fait déjà pour `tags`. Aucune requalification de la syntaxe de filtre n'est nécessaire au
niveau du moteur, seulement le **nom** du champ interrogé (`cities` au lieu de `city`).

---

## 6. Comment l'IA va réagir — cas par cas

Le prompt (`buildCategoryListingDraftPrompt`) et le parseur
(`parseCategoryListingDraftResponse`) sont testés unitairement aujourd'hui
(`__tests__/services/ai-category-listing.service.test.ts`, 219 lignes). Cas à couvrir pour
`cities` :

| Description du vendeur | Comportement attendu |
|---|---|
| « Disponible à Libreville » (1 ville, cas actuel) | `cities: ["Libreville"]` — **identique au comportement `city` actuel**, juste encapsulé dans un tableau à 1 élément |
| « Je vends à Libreville et Franceville » | `cities: ["Libreville", "Franceville"]` |
| « Disponible à Libreville, Port-Gentil, Franceville et Oyem » | `cities: [...4 villes]`, plafonné si > max (proposition 5, voir §9) — pas d'erreur, juste une troncature silencieuse + log |
| Aucune ville mentionnée | `cities: []` — même filet de rattrapage qu'aujourd'hui (`city: null`), corrigible en preview |
| « un peu partout », « dans tout le pays » | Aucune ville concrète à extraire → `cities: []` — consigne explicite au prompt : ne jamais inventer une liste de villes à partir d'une formulation vague (même règle déjà en place pour le prix : « n'invente jamais... mets null ») |
| « Libreville » mentionnée deux fois dans la description | Dédupliquée (insensible à la casse/espaces) — sinon le seller verrait deux fois la même puce en preview |
| Réponse Gemini qui ignore le nouveau format et renvoie encore `"city": "Libreville"` | Le parseur tolère les deux formes (défense en profondeur) — extrait `["Libreville"]` plutôt que de planter la génération |
| Réponse Gemini avec un nom de ville qui n'existe pas au Gabon | Pas de garde-fou aujourd'hui pour `city` non plus (voir §3.3) — pas une régression introduite par ce chantier, juste pas amélioré par défaut |

**Ce qui ne change pas côté IA** : le coût crédit (`DRAFT_CREDIT_COST = 1`, un seul appel
Gemini, peu importe le nombre de villes détectées), le flux d'authentification/crédits de
`/api/ai/category-listing-draft/route.ts`, et surtout — **l'IA immobilière
(`/api/ai/property-draft`, `ai-form.service.ts`) n'est pas touchée du tout**, elle ne partage
aucun code avec `ai-category-listing.service.ts`.

---

## 7. Migration et rétrocompatibilité — zéro backfill obligatoire

Une annonce Mode existante n'a **pas** de champ `zones`/`cities`/`provinces`, seulement
`city`/`province` singuliers. Grâce à `getListingZones()` (§4.6, qui retombe sur les champs
singuliers si `zones` est absent), **elle s'affiche exactement comme avant sur toutes les
pages** sans qu'aucun script ne tourne. Seule différence : elle n'apparaît pas encore dans
les résultats de recherche filtrés sur une deuxième ville (normal, elle n'en a qu'une) tant
que le vendeur ne l'a pas éditée une fois.

**Backfill optionnel recommandé** (`scripts/backfill-listing-zones.js`, même famille que
`scripts/backfill-listing-categories.js` déjà en place) : pour chaque annonce
`locationPrecision === "city"` sans `zones`, écrire `zones: [{city, province, latitude,
longitude}]` + `cities: [city]` + `provinces: [province]` à partir des champs existants —
mécanique, réversible, rend immédiatement toutes les annonces existantes cohérentes avec le
nouveau modèle (sans changer leur contenu, juste sa forme), et élimine le besoin du repli
dans `getListingZones()` à terme.

---

## 8. Plan de tests

### 8.1 Jest — nouveaux tests et extensions

| Fichier | Nature | Couvre |
|---|---|---|
| `src/lib/listing-zones.ts` + `__tests__/lib/listing-zones.test.ts` (nouveau) | Unitaire pur | `getListingZones` (repli sur champs singuliers), `formatZonesLabel` (troncature 1/2/N zones, dédoublonnage d'affichage) |
| `__tests__/services/ai-category-listing.service.test.ts` (existant, 219 lignes) | Étendu | Prompt contient l'instruction « toutes les villes » ; `parseCategoryListingDraftResponse` avec `{"cities":[...]}`, avec doublons, avec `[]`, avec l'ancien format `{"city":"X"}` en tolérance, avec > max éléments (troncature) |
| `apps/mobile/src/api/__tests__/algolia.test.ts` (existant) | Étendu | `buildFilters` bascule `city:`/`cities:` selon `isImmobilierScope`, comme le fait déjà le test pour `province`/`typeProperty` |
| `src/lib/search/search-filter-query.ts` — test associé (à vérifier/créer) | Étendu | Même bascule côté web |
| `__tests__/lib/seo-listing-share.test.ts` (à vérifier/créer) | Étendu | `buildListingShareTitle`/`getListingLocationLabel` avec `zones` multiples vs propriété immobilier (non affectée) |
| location-maison-admin : test du service `category-listing.service.ts` (existant, à localiser) | Étendu | Validation `cities: string[]` (0 → erreur, 1 → ok identique à avant, > max → erreur), construction de `zones`/`cities`/`provinces` |
| Composant `EditableZonesField` (nouveau) | Test composant (si convention RTL déjà en place dans ce dossier — à vérifier) | Ajout/suppression de puce, appel `onSave` avec la forme attendue |

### 8.2 E2E (Playwright) — extension de `property-and-mode-creation.spec.ts`

Le spec existant ([__tests__/e2e/property-and-mode-creation.spec.ts](../../apps/location-maison/__tests__/e2e/property-and-mode-creation.spec.ts))
publie déjà une vraie annonce immobilière ET une vraie annonce Mode via leurs formulaires
réels, avec écriture Firestore vérifiée — c'est le point d'extension naturel, pas un nouveau
fichier isolé (cohérent avec `[[feedback-e2e-minimal-data-footprint]]` : réutiliser
l'existant plutôt que semer de nouvelles données).

1. **Détection multi-zones par l'IA** : `MODE_DESCRIPTION` mise à jour en « ... disponible à
   Libreville et Franceville... » → après génération, `getProperty(modeListingId).zones` (ou
   `.cities`) contient les deux villes, dans cet ordre, sans doublon.
2. **Édition manuelle des zones sur la preview** (l'URL exacte citée par l'utilisateur) :
   sur `/category-listing/create/preview/[id]`, ajouter une 3ᵉ ville via `EditableZonesField`
   → poll Firestore, `zones.length === 3`. Puis en retirer une → `zones.length === 2`.
3. **Affichage `/property?submitted=1`** : l'onglet Mode de `AdManagementPage` montre bien un
   libellé multi-zones sur la carte (ex. texte contenant "Libreville" ET "Franceville", ou
   "+1" selon la troncature retenue en §9).
4. **Fiche publique `/annonce/[id]`** : `page.goto('/annonce/' + modeListingId)` → au moins
   2 puces de zone visibles ; le `<script type="application/ld+json">` injecté contient un
   `areaServed` de longueur 2 (parsing du JSON du script).
5. **Recherche retrouvant la annonce par une zone NON primaire** — le test à plus forte
   valeur : chercher (via `/search` ou l'API `/api/algolia/search`) en filtrant sur
   « Franceville » (la 2ᵉ ville, pas la première) et vérifier que l'annonce créée à l'étape 1
   apparaît. C'est la preuve directe que le problème remonté par les vendeurs est résolu — une
   annonce dont `city` primaire serait "Libreville" seul aurait été invisible pour une
   recherche "Franceville" avec l'ancien modèle.
6. **Non-régression immobilier** : le scénario immobilier déjà présent dans ce spec continue
   de passer sans modification — aucune assertion sur `city`/`province` (singuliers) à
   changer pour la partie immobilière du test.
7. **Non-régression annonce Mode pré-migration** : seed direct (Admin SDK,
   `seedCategoryListing`, déjà un helper existant dans `helpers/firebase-admin.ts`) d'une
   annonce Mode à l'ANCIEN format (`city`/`province` seuls, pas de `zones`) → `/annonce/[id]`
   et `/property?submitted=1` l'affichent normalement (1 seule puce/ville), sans erreur —
   preuve directe de la rétrocompatibilité du §7.

---

## 9. Décisions à trancher par l'utilisateur

1. **Nombre maximum de zones par annonce** — proposition : 5 (au-delà, ça ressemble à une
   annonce nationale, pas à une liste de zones de vente ; l'IA plafonne, l'éditeur manuel
   aussi).
2. **Affichage au-delà de 2 zones** — puces tronquées avec « +N » (compact, cohérent avec la
   contrainte de hauteur de carte déjà documentée dans `ListingCard.tsx`) vs liste complète
   qui pousse la mise en page. Recommandation : troncature partout sauf sur la fiche détail
   `/annonce/[id]`, où l'espace le permet.
3. **Valider les villes contre le catalogue Gabon (`gabon-locations.ts`)** — durcissement
   optionnel (§3.3), à faire maintenant ou plus tard, indépendamment de ce chantier.
4. **Ordre d'implémentation entre les deux dépôts** — `location-maison` (web, chemins 1/2,
   affichage, recherche) d'abord, `location-maison-admin` (chemin 3/4) ensuite ? Ou en
   parallèle ? Recommandation : web d'abord (c'est le chemin réellement utilisé par les
   vendeurs aujourd'hui, l'admin ne sert que l'import/backoffice), admin dans un second lot
   pour ne pas bloquer sur deux dépôts à la fois.
5. **Backfill immédiat ou différé** (§7) — recommandation : différé et optionnel, rien ne
   l'exige pour livrer la fonctionnalité, la rétrocompatibilité est déjà garantie sans lui.
6. **Faut-il un flag par catégorie (`zoneSelection: "single" | "multi"` sur
   `listing_categories`) ou l'activer pour toute catégorie `locationPrecision === "city"`
   sans distinction ?** Recommandation : pas de nouveau flag — la distinction
   `exact`/`city` suffit déjà, ajouter un troisième axe de configuration sans cas d'usage
   connu serait de la complexité anticipée.

---

*Créé le 2026-09-11 — analyse et proposition d'architecture, rien n'est encore implémenté.
Prochaine étape suggérée : trancher §9, puis découper en lots (même format que
[07-lots-et-sequencement.md](./07-lots-et-sequencement.md)) avant d'écrire le moindre code.*
