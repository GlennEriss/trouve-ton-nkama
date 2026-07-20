# Lot 9A - Inventaire et couverture a 20 %

Date : 2026-07-20

## Objectif

Identifier les fichiers non couverts a fort volume, ajouter des tests qui exercent du
code reel sans modifier artificiellement le perimetre Jest, puis rendre impossible une
regression sous 20 % de lignes couvertes.

## Point de depart

| Metrique | Avant 9A | Cible 9A |
| --- | ---: | ---: |
| Lignes | 14,45 % (13 111 / 90 675) | 20 % |
| Instructions | 14,45 % | 20 % |
| Fonctions | 31,66 % | sans regression |
| Branches | 50,76 % | sans regression |

Les plus gros fichiers a 0 % etaient notamment la route de recherche IA, le wizard
publicitaire, la gestion d'annonces, les reels, le catalogue, les statistiques, les
pages editoriales, les emails et les formulaires de profil.

## Tests ajoutes

### Pages editoriales

Le test `__tests__/components/editorial-pages.test.tsx` couvre les onze articles du
blog, son index et le guide immobilier. Il verifie pour chaque surface :

- un titre principal unique et visible ;
- des metadonnees SEO exploitables ;
- la structure `article` des articles ;
- des liens internes non vides et un acces a la recherche ;
- les raccourcis SEO et appels a action des pages catalogue.

Ces 13 pages atteignent 100 % de leurs 6 184 lignes instrumentees.

### Localisations OSM

Le test `__tests__/lib/gabon-osm-locations.test.ts` couvre :

- le rejet des racines invalides ;
- la priorite du nom francais, le tri et les coordonnees valides ;
- les associations quartier, ville et province ;
- la conversion entre `Map` et donnees serialisables ;
- le cache du jeu OSM embarque ;
- la distinction entre doublons proches et homonymes eloignes.

Le module atteint 98,44 % des lignes et 100 % des fonctions. L'audit a revele que deux
entrees OSM proches portant le meme nom pouvaient apparaitre deux fois dans les champs de
localisation. Elles sont maintenant fusionnees dans un rayon d'un kilometre ; deux lieux
homonymes eloignes restent distincts.

## Resultats

Commande ciblee :

```bash
cd apps/location-maison
npm test -- --runInBand --coverage=false \
  __tests__/components/editorial-pages.test.tsx \
  __tests__/lib/gabon-osm-locations.test.ts
```

Resultat : 22/22 tests passes.

Commande complete :

```bash
cd apps/location-maison
npm run test:ci
```

Resultat : 59 suites passees, 1 ignoree, 375 tests passes et 6 ignores.

Validations complementaires :

```bash
cd apps/location-maison
npm run check:coverage
npm run check:types
npm run build
```

Les trois commandes passent. Le build genere correctement les 214 pages ; Next.js emet
encore l'avertissement historique `ENOWORKSPACES` pendant sa tentative non bloquante de
patch du lockfile SWC.

| Metrique | Apres 9A | Progression |
| --- | ---: | ---: |
| Lignes | 21,90 % (19 863 / 90 678) | +7,45 points |
| Instructions | 21,90 % | +7,45 points |
| Fonctions | 34,19 % (382 / 1 117) | +2,53 points |
| Branches | 51,34 % (1 626 / 3 167) | +0,58 point |

Les gardes globales Jest et le controle CI independant exigent desormais 20 % de lignes
et instructions, 30 % de fonctions et 50 % de branches.

## Inventaire pour le Lot 9B

Principaux fichiers encore a 0 % apres le lot :

| Fichier | Lignes instrumentees |
| --- | ---: |
| `src/app/api/ai-search/chat/route.ts` | 1 177 |
| `src/components/advertising/AdvertisingCreateWizard.tsx` | 1 151 |
| `src/features/announcer/ad-management/ui/v1/AdManagementPage.tsx` | 893 |
| `src/components/reels/ReelsFeedClient.tsx` | 834 |
| `src/components/property/ListPropertySection.tsx` | 683 |
| `src/components/property/PropertyStatisticsPanel.tsx` | 594 |
| `src/features/users/profile-management/ui/v1/ProfileInformationFormModern.tsx` | 562 |
| `src/emails/PropertyPublished.tsx` | 544 |
| `src/components/stepper/step1.components.tsx` | 536 |
| `src/components/reels/MyReelsClient.tsx` | 522 |
| `src/features/auth/ui/v1/CompleteProfileFormModern.tsx` | 495 |
| `src/components/property-publish/PublishAuthModal.tsx` | 466 |

Le Lot 9B visera 30 % global en priorisant les composants, hooks, providers, formulaires
et emails de cette liste. La route IA restera dans le perimetre API du Lot 9C, sauf si
ses helpers purs sont extraits plus tot pour faciliter les tests.
