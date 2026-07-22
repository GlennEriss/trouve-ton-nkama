# Lot 9B - Composants majeurs et couverture a 30 %

Date : 2026-07-21

## Objectif

Porter la couverture globale de l'application au-dessus de 30 % sans reduire le
perimetre `collectCoverageFrom`, en exercant les composants a fort volume identifies
au Lot 9A et leurs frontieres metier.

## Point de depart

Le rapport frais execute avant les nouveaux tests mesurait 23,07 % des lignes et
instructions (21 054 / 91 253), 36,60 % des fonctions et 52,40 % des branches. La
baseline officielle du Lot 9A etait de 21,90 % ; l'ecart vient des changements deja
presents dans la branche au demarrage du lot.

## Tests ajoutes

### Publicite

- `advertising-create-wizard.test.tsx` couvre les quatre etapes, le format du CTA,
  l'upload, la publication idempotente, les liens invalides, le retrait du visuel,
  les credits insuffisants et l'absence de session.
- `ad-management-page.test.tsx` couvre le tableau annonceur, les filtres, la pagination,
  les confirmations, l'archivage, l'activation, la suppression et les etats limites.
- `use-ad-management.test.ts` verifie le contrat des requetes, le debounce, la
  normalisation des filtres, les mutations et l'invalidation du cache.

### Reels

- `reels-feed-client.test.tsx` couvre le feed, l'insertion publicitaire, la lecture,
  les likes avec rollback, WhatsApp, les cadeaux, le partage, le son, le prechargement,
  la pagination et les etats erreur/vide.
- `my-reels-client.test.tsx` couvre les statistiques annonceur, les statuts de
  traitement/moderation, les filtres de date, la pagination et la suppression.

### Annonces et statistiques

- `list-property-section.test.tsx` couvre la requete du proprietaire, les curseurs,
  la pagination, les etats chargement/vide/erreur, l'archivage et le cache pagine.
  Les informations specifiques aux dix types de biens sont rendues dans la matrice.
- `property-statistics-panel.test.tsx` couvre les quatre periodes, les compteurs animes,
  la courbe, les performances, les cinq premieres provinces, les interactions, les
  donnees vides et les variantes de timestamp Firestore.

### Emails

- `email-templates.test.tsx` genere du HTML reel pour le layout commun et les emails de
  bienvenue, verification, reinitialisation, publication et notification generique.
  Les liens sociaux, la desinscription, les champs facultatifs et les listes dynamiques
  sont verifies.

## Resultats

Commande complete :

```bash
cd apps/location-maison
npm run test:coverage:baseline
```

Resultat : 73 suites passees, 1 ignoree, 443 tests passes et 6 ignores.

| Metrique | Avant le lot | Apres 9B | Progression |
| --- | ---: | ---: | ---: |
| Lignes | 23,07 % | 31,02 % (28 313 / 91 253) | +7,95 points |
| Instructions | 23,07 % | 31,02 % | +7,95 points |
| Fonctions | 36,60 % | 43,49 % (585 / 1 345) | +6,89 points |
| Branches | 52,40 % | 58,51 % (2 536 / 4 334) | +6,11 points |

Les 49 nouveaux tests ajoutent 7 259 lignes couvertes au rapport global.

## Couverture ciblee

| Module | Lignes | Branches | Fonctions |
| --- | ---: | ---: | ---: |
| Wizard publicitaire | 86,79 % | 74,51 % | 75 % |
| Page de gestion publicitaire | 95,63 % | 72,22 % | 72 % |
| Hook de gestion publicitaire | 99,32 % | 98,52 % | 100 % |
| Feed reels | 90,40 % | 71,33 % | 69,23 % |
| Mes reels | 99,80 % | 87,37 % | 89,47 % |
| Liste des annonces | 99,70 % | 81,90 % | 100 % |
| Statistiques d'annonce | 99,66 % | 96,55 % | 100 % |
| Six gabarits email combines | 98,98 % | 89,28 % | 100 % |

## Gardes CI

Les seuils globaux de `jest.config.ts` et du controle independant
`scripts/check-location-maison-coverage.cjs` sont maintenant :

- 30 % de lignes et instructions ;
- 40 % de fonctions ;
- 55 % de branches.

Des seuils locaux protegent aussi les neuf principaux modules ajoutes au rapport. Le
Lot 9C visera 40 % global avec la recherche IA, les routes API, le profil, les
notifications et l'administration.
