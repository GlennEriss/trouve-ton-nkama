# Lot 10B - Clusters UI et palier final 60 %

Date d'execution : 2026-07-23

## Objectif

Porter les lignes et instructions de l'application de 55 % a 60 % en couvrant les grands
clusters de composants encore a 0 % identifies au demarrage du Lot 10 : page d'accueil,
fiche detail annonce et recherche.

## Perimetre teste

- **home-page** : `PropertyCard`, `Navbar`, `InputSearchNavbar`, `HomePageMobileComponent`,
  `HomePageDesktopComponent`, `HomeHeroSponsoredSwap`, `PropertyByProvince`,
  `HomePageComponent`, `RecentSection`/`FeaturedSection`/`TrendingSection`,
  `FilterModal`/`FilterModalHomePage`, `AlgoliaFilters`, `PropertyTypeList` ;
- **preview-property** : `Tag`, `ButtonShare`/`ButtonShareToFacebook`/`ButtonShareToWhatsapp`,
  `ButtonFavoris`, `ContactSection`, `HouseDetailSkeleton`, `MapSection`,
  `RecommendationSection`, `CarouselPropertyDetails`, `CarouselProperty`, `DetailsProperty`,
  `DetailsPropertyMobile`, `PreviewProperty`, `PreviewPropertyMobile` ;
- **search** : `SelectProvince`/`SelectCity`/`SelectStreet`, `SearchPageComponent`,
  `MapViewerModal`, `SearchWithAIAccessNoticeDialog`, `LocationFiltersDropdown`,
  `SearchDesktopPage`, `FilterSearchDesktopPageSection`, `PropertyDetailsPanel`.

Les tests exercent le rendu reel, les etats de chargement/erreur/vide, les interactions
(clics, clavier, swipe simule), les branches mobile/desktop, les regles d'autorisation
(proprietaire, authentification) et les effets de bord (tracking, navigation, appels reseau
mockes a la frontiere).

## Resultat

| Metrique | Resultat | Seuil CI |
| --- | ---: | ---: |
| Lignes | 60,16 % (54 722 / 90 946) | 60 % |
| Instructions | 60,16 % (54 722 / 90 946) | 60 % |
| Fonctions | 66,15 % (1 296 / 1 959) | 55 % |
| Branches | 73,29 % (7 216 / 9 845) | 65 % |

- 185 suites passees et 1 suite ignoree (emulateur Firestore, hors emulator) ;
- 1 219 tests passes et 6 ignores ;
- environ 25 nouveaux fichiers de tests, plus de 150 nouveaux cas ;
- seuils CI releves a 60 % lignes/instructions, 55 % fonctions et 65 % branches
  (`jest.config.ts` et `scripts/check-location-maison-coverage.cjs`, profil `application`) ;
- `npm run check:types` vert.

## Principe anti-faux-vrai applique

Chaque composant est rendu reellement (React Testing Library) et les assertions portent sur
le DOM produit, les appels reels aux mocks d'infrastructure (routeur, tracking, fetch,
Firestore/Redis a la frontiere) et les branches conditionnelles reelles du composant. Les
enfants deja testes separement sont mockes pour isoler le composant sous test plutot que par
souci de simplicite.

Deux constats de code reel decouverts en testant (et non corriges, hors scope de ce lot) :

- `Navbar.tsx` : sur mobile, la branche `if (user) return <barre compacte>` court-circuite
  avant toute verification `isAnnouncer`, rendant les CTA "Poster une annonce"/"Publicite" du
  bloc visiteur plus bas inatteignables pour un utilisateur connecte en mobile ;
- `DetailsProperty.tsx`/`DetailsPropertyMobile.tsx` : repli documente `nbrKitchens ??
  nbrChickens` (typo historique conservee pour compatibilite avec des documents existants).

## Fichiers exclus de ce lot

- `HomePage.tsx` et `ModaleLanguageSwitcher.tsx` (home-page) : code mort, aucun import ailleurs
  dans `src/`, non teste conformement au principe de ne pas tester du code hypothetique ;
- `CarouselPropertyType.tsx` : bloque par un defaut d'environnement preexistant
  (`identity-obj-proxy`, cible par `moduleNameMapper` pour les imports CSS, absent de
  `node_modules` malgre sa reference dans `jest.config.ts`). Corriger necessiterait un
  `npm install` depuis la racine du monorepo, hors perimetre de ce lot sans validation
  prealable. Affecte aussi potentiellement `LeafletMap.tsx`, `LocationMap.tsx` et
  `SimpleMap.tsx` s'ils sont un jour testes sans mock du composant important le CSS.

## Verification

```bash
cd apps/location-maison
npm run test:ci
npm run check:types
```

Le rapport machine est genere dans `apps/location-maison/__tests__/coverage/coverage-summary.json`
et le rapport navigable dans `apps/location-maison/__tests__/coverage/lcov-report/`.

## Reporte a une prochaine iteration

- les tests sur emulateur Firestore reel pour les routes critiques (credits, idempotence),
  prevus par le principe anti-faux-vrai et deja reportes lors du Lot 10A ;
- la resolution du defaut d'environnement `identity-obj-proxy` (probablement un
  `npm install` a la racine du monorepo) pour debloquer les 4 fichiers important du CSS ;
- une passe de mutation testing (Stryker) sur les modules critiques, comme prevu au
  demarrage du Lot 10, non lancee faute de temps dans ce lot.
