# Baseline couverture de tests

Date : 2026-07-18

## App Next.js

Commande utilisee pour une sortie lisible :

```bash
cd apps/location-maison
npm run test:coverage:baseline
```

Resultat :

- Suites : 25 passees, 1 ignoree.
- Tests : 165 passes, 4 ignores.
- Statements : 7.54 %.
- Branches : 37.11 %.
- Functions : 15.63 %.
- Lines : 7.54 %.

Note : la suite ignore automatiquement le test Firestore emulator quand `FIRESTORE_EMULATOR_HOST` n'est pas defini. Le test reste actif avec :

```bash
cd apps/location-maison
npm run test:emulator:api
```

Dernier resultat emulator : 4 tests passes.

Seuil de baseline actif dans `jest.config.ts` :

- Statements : 7 %.
- Branches : 35 %.
- Functions : 15 %.
- Lines : 7 %.

## Cloud Functions

Commande utilisee pour une sortie lisible :

```bash
cd apps/location-maison/functions
npm run test:coverage:baseline
```

Resultat :

- Suites : 5 passees, 2 ignorees.
- Tests : 39 passes, 5 ignores.
- Statements : 15.45 %.
- Branches : 14.57 %.
- Functions : 16.86 %.
- Lines : 15.74 %.

Notes :

- Les tests email avec dependance Firebase/Auth reelle sont opt-in via `ENABLE_EMAIL_INTEGRATION_TESTS=true`.
- Le test d'envoi email reel reste opt-in via `ENABLE_REAL_EMAIL_TEST=true`.
- Une compatibilite `SlowBuffer` a ete ajoutee aux Functions pour Node recent et les dependances legacy chargees par `firebase-admin` / `jsonwebtoken`.

Seuil de baseline actif dans `jest.config.js` :

- Statements : 15 %.
- Branches : 14 %.
- Functions : 16 %.
- Lines : 15 %.

## Interpretation

Les chiffres globaux sont bas, surtout cote app, car `collectCoverageFrom` inclut presque tout `src` : pages Next, layouts, providers, composants UI, mediators, services et code metier. Cette baseline ne veut pas dire que les tests metier sont inutiles ; elle montre surtout que le projet contient beaucoup de surface UI non couverte.

On ne doit pas activer directement un seuil global a 70 % ou 80 %. Le bon ordre est :

1. Proteger les zones critiques avec des seuils cibles locaux : credits, paiements, idempotence, gifts, reels, publicites, telephone.
2. Ajouter une garde globale basse pour eviter de redescendre sous la baseline.
3. Monter progressivement le global : 15 %, 25 %, 40 %, puis 60 %+.
4. Viser 70-80 % uniquement quand les pages/UI majeures ont des tests de composants ou E2E suffisants.

## Prochaines actions couverture

- Ajouter un script de couverture focalise sur le metier critique.
- Sortir les tests opt-in externes du chemin standard de couverture/CI.
- Ajouter les premiers seuils sur les dossiers critiques au lieu du global complet.
- Utiliser le rapport HTML local pour identifier les fichiers a fort impact non couverts.
