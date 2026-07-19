# Lot 8A - Annonces : formulaires, CRUD et securite

Date d'execution : 2026-07-19.

## Objectif

Proteger le parcours annonce avant les tests visuels : detection du type depuis la route,
valeurs par defaut, validation complete, preparation des images et localisations, creation,
modification, suppression, moderation et double soumission.

## Perimetre automatise

- 12 routes de formulaire : appartement, immeuble, bureau, duplex, maison, kiosque,
  terrain, chambre, commerce, studio, villa et entrepot ;
- constructeurs et directeurs metier, dont le numero de studio `01` ;
- schemas complets et schemas de l'etape 2 ;
- conservation et upload des images, nettoyage des coordonnees techniques et gestion
  best effort des entites province/ville/rue ;
- CRUD Firestore, dates serveur, pagination, filtres publics et compatibilite de l'ancien
  champ `nbrChickens` ;
- moderation forcee a `PENDING` et retrait des champs de revue a la creation ;
- resoumission d'une annonce rejetee, visiteur non connecte et garde anti-double clic ;
- permissions Firestore du proprietaire et refus d'un autre utilisateur.

## Defauts corriges

1. Les routes `duplex` et `warehouse` retombaient sur le type generique `Property`.
2. Le directeur ne possedait pas de factory pour `Duplex` et `Warehouse`.
3. Le schema final retirait les champs specifiques de ces deux types.
4. Le schema immeuble validait `nbrAppartement` et un parking numerique alors que le
   formulaire ecrit `nbrApartments` et un booleen.
5. Les coordonnees `0,0` retirees du formulaire etaient reinjectees par l'objet construit.

## Resultats

| Verification | Resultat |
| --- | --- |
| Tests cibles Lot 8A | 57/57 PASS |
| TypeScript application | PASS |
| Suite CI application | 317 PASS, 6 ignores |
| Regles Firestore Emulator | 20/20 PASS |
| Regression API Firestore Emulator | 6/6 PASS |
| Seuils globaux et locaux | PASS |

La couverture globale application atteint 13,60 % des lignes, 50,43 % des branches et
30,34 % des fonctions. Le gain global vient de tests reellement executes ; aucun fichier
n'a ete retire du denominateur.

### Couverture des modules annonces critiques

| Module | Lignes | Branches | Fonctions |
| --- | ---: | ---: | ---: |
| CRUD generique | 100 % | 100 % | 100 % |
| Depot annonces | 96,06 % | 86,66 % | 100 % |
| Directeur de type | 97,46 % | 92,85 % | 100 % |
| Detection du type par route | 98,18 % | 94,11 % | 100 % |
| Preparation avant soumission | 100 % | 75 % | 100 % |
| Selection des schemas | 83,62 % | 31,03 % | 100 % |
| Provider du formulaire | 77,18 % | 71,87 % | 66,66 % |

Des seuils CI locaux conservateurs ont ete ajoutes pour chacun de ces modules. Une baisse
future sous ces seuils fera echouer `npm run test:ci`.

## Commandes

```bash
cd apps/location-maison

npx jest --config jest.config.ts --runInBand --coverage=false \
  __tests__/hooks/useOnSubmitFormProperty.test.ts \
  __tests__/property/property-builders-and-schemas.test.ts \
  __tests__/property/property-form-provider.test.tsx \
  __tests__/db/property.db.test.ts \
  __tests__/db/generic.db.test.ts

npm run check:types
npm run test:ci
npm run test:rules
npm run test:emulator:api
```

## Risque residuel

Ce lot couvre le metier et les droits. Le rendu mobile des douze formulaires, la saisie
reelle de chaque variante et le parcours complet avec photos dans un navigateur restent
le perimetre du Lot 8B.
