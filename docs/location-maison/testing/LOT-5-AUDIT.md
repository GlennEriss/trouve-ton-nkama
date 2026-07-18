# Lot 5 - Audit UX, accessibilite et coherence artistique

Date : 2026-07-18

## Lot 5A - Pages annonceur prioritaires

Perimetre automatise :

- `/reels/add?returnTo=%2Freels%2Fmine`
- `/property`
- `/advertising/create`
- `/gifts`
- viewport mobile 390 x 844
- viewport desktop 1440 x 960

## Commandes

```bash
cd apps/location-maison
npm run test:e2e:lot5
npm run test:e2e:lot5:screenshots
```

Dernier resultat : 8 tests passes en 27.7 s.

## Validation croisee

La correction de `/gifts` et les composants partages ont aussi ete verifies hors du test visuel :

```bash
cd apps/location-maison
npx tsc --noEmit
npm test -- --runInBand --coverage=false \
  __tests__/api/gifts-summary.test.ts \
  __tests__/api/gifts-withdrawals.test.ts \
  __tests__/api/credits-verify-code.test.ts \
  src/features/users/phone-verification/services/__tests__/phone-verification.service.test.ts
npm run test:emulator:api
```

Resultats :

- TypeScript : aucune erreur ;
- API et services cibles : 21 tests passes ;
- Firestore emulator : 4 tests passes, avec concurrence et idempotence reelles ;
- regression Playwright Lots 4A a 4D : 15 tests passes en 42.1 s.

Les routes cadeaux couvrent desormais les deux modes d'authentification : session web NextAuth et jeton Firebase de compatibilite.

## Barrières automatisees

- aucune violation Axe/WCAG de niveau `serious` ou `critical` ;
- aucune zone tactile testee sous 44 x 44 px sur mobile ;
- aucun debordement horizontal ;
- la derniere action reste atteignable au-dessus de la bottom navigation ;
- verification avec `prefers-reduced-motion: reduce` ;
- captures pleine page avant/apres sur mobile et desktop.

## Corrections appliquees

- Le champ d'import video possede maintenant un nom accessible et un contraste lisible.
- `/reels/add` reprend l'en-tete, les couleurs et la hierarchie de l'espace annonceur.
- Les filtres de `/property` possedent des labels et noms accessibles explicites.
- Les actions de carte font au moins 44 px de haut.
- `Ajouter un reel` et `Promouvoir` sont sur la meme ligne avec un style coherent.
- Le declencheur de notifications est un bouton unique valide, sans controle interactif imbrique.
- Le logo et le menu profil possedent un nom accessible.
- Le wizard publicitaire utilise un vrai `progressbar` ARIA et des couleurs conformes au contraste WCAG.
- `/gifts` ne depend plus de Firebase Auth cote navigateur pour charger son API : la session NextAuth serveur suffit, avec Bearer Firebase conserve en compatibilite.
- `/gifts` reprend les marges, l'en-tete et les couleurs de l'espace annonceur ; son formulaire de retrait possede label, clavier mobile et etats ARIA.

## Captures

Les captures sont conservees dans :

- `docs/location-maison/testing/screenshots/lot5/before`
- `docs/location-maison/testing/screenshots/lot5/after`

La page `/gifts` ne possede pas de capture `before` exploitable : elle restait bloquee avant d'afficher son contenu. Ses captures mobile et desktop existent dans `after`.

## Lot 5B - Formulaires, profil, credits et authentification

Perimetre automatise :

- `/property/add/studio` ;
- `/profil` et `/profil/informations` ;
- `/my-balance/history` et `/my-balance/recharge` ;
- `/signin` et `/signup` ;
- viewports 390 x 844 et 1440 x 960 ;
- themes clair et sombre.

Commande :

```bash
cd apps/location-maison
npm run test:e2e:lot5b
npm run test:e2e:lot5b:screenshots
```

Dernier resultat : 28 tests passes en 4 min 18 s sur un serveur Turbopack demarre a froid.

Chaque scenario verifie :

- le rendu du titre et de l'action principale ;
- l'absence de debordement horizontal ;
- l'absence de violation Axe/WCAG `serious` ou `critical` ;
- l'acces clavier a l'action cible ;
- les zones tactiles de 44 x 44 px minimum sur mobile ;
- l'absence de recouvrement de la derniere action par la bottom navigation ;
- le rendu explicite du dark mode ;
- le respect de `prefers-reduced-motion`.

Corrections appliquees :

- Les champs texte, date, telephone, select, fichier, textarea et nombres possedent des labels ou noms accessibles coherents.
- Les boutons mot de passe, retour, increment/decrement, onglets de credits et actions de formulaire atteignent 44 px minimum.
- Les titres, aides, badges et boutons conservent un contraste WCAG conforme en clair et en sombre.
- Le profil annonceur replie les dix champs de reseaux sociaux facultatifs derriere une section explicite.
- L'assistant d'annonce ne montre plus sa bulle au-dessus des champs sur mobile et son lanceur y est plus compact.
- L'inscription desktop respecte `prefers-reduced-motion`, ce qui supprime les transitions imposees aux personnes qui les desactivent.
- Les pages de credits ne dependent plus de Firebase Auth dans le navigateur : la session NextAuth est acceptee par les API, avec le jeton Firebase conserve en repli.
- Une API serveur paginee `/api/credits/history` remplace la lecture directe de l'historique dans le navigateur.
- Les packs inactifs sont filtres et les packs actifs restent tries selon la configuration admin.

Validation metier et regressions :

```bash
cd apps/location-maison
npx tsc --noEmit
npx jest --runInBand --coverage=false \
  __tests__/api/credits-read-routes.test.ts \
  __tests__/api/gifts-summary.test.ts \
  __tests__/api/gifts-withdrawals.test.ts \
  __tests__/api/credits-verify-code.test.ts \
  src/features/users/phone-verification/services/__tests__/phone-verification.service.test.ts
npm run test:e2e:lot5
npx playwright test --project=chromium-mobile --workers=1 \
  __tests__/e2e/lot4-mobile-public.spec.ts \
  __tests__/e2e/lot4-mobile-announcer.spec.ts \
  __tests__/e2e/lot4-mobile-crud.spec.ts \
  __tests__/e2e/lot4-mobile-advertising.spec.ts
```

Resultats : TypeScript sans erreur, 26 tests API/services passes, Lot 5A a 8/8 et regression Lot 4 a 15/15.

Les captures 5B sont conservees dans `docs/location-maison/testing/screenshots/lot5b`.

## Suite

- Conserver le test Lot 5 dans la regression de release.
- Etendre progressivement la matrice aux autres types de formulaire d'annonce sans dupliquer les memes controles.
- Passer au Lot 5C pour l'audit transversal des composants et pages restantes, puis au Lot 6 pour les publicites et le monitoring.
