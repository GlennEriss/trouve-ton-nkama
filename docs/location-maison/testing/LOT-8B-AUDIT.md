# Lot 8B - Annonces dans le navigateur

Date d'execution : 2026-07-19.

## Objectif

Verifier les douze formulaires d'annonces dans un vrai navigateur, sur mobile et desktop,
puis executer le CRUD complet contre Firebase dev sans mocks et sans laisser de donnees
de test.

## Perimetre automatise

- 12 variantes : appartement, immeuble, bureau, duplex, maison, kiosque, terrain,
  chambre, commerce, studio, villa et entrepot ;
- matrice mobile `390 x 844` et desktop `1440 x 960` ;
- champs specifiques, libelles accessibles, claviers numeriques et absence de debordement ;
- valeurs restaurees, numero de studio/appartement `01` et choix parking `Non` ;
- erreurs de l'etape 1, upload d'une image locale, brouillon et reset confirme ;
- navigation precedent/suivant et conservation des valeurs ;
- indicatif `+241` et normalisation de `066545430` en `66545430` ;
- creation reelle avec image Storage, double clic, modification, moderation et suppression ;
- nettoyage garanti des documents Firestore et fichiers Storage du smoke test.

## Defauts corriges

1. Les champs numeriques utilisaient un input texte sans clavier decimal mobile.
2. Le choix parking `Non` devenait `true` a cause de `Boolean("false")`.
3. Les composants de l'etape 2 absorbaient les identifiants et attributs ARIA : les
   libelles visibles n'etaient pas relies aux inputs.
4. `InputApp` ne transmettait pas les refs React, ce qui pouvait perturber focus et
   validation et produisait un avertissement dans les tests.
5. Plusieurs instances de `useCurrentUser` demandaient chacune un custom token Firebase.
   Une promesse partagee limite maintenant une page a une seule synchronisation par UID.
6. Le serveur Playwright ecoutait sur `3001`, mais les redirections utilisaient encore
   les variables d'origine en `3000`.

## Resultats

| Verification | Resultat |
| --- | --- |
| Matrice Playwright Lot 8B | 27/27 PASS |
| Smoke CRUD Firebase dev | PASS |
| Creation apres double clic | 1 seul document |
| Nettoyage du dernier smoke | 0 document, 2 fichiers supprimes |
| Tests unitaires application | 320 PASS, 6 ignores |
| TypeScript application | PASS |
| Seuils de couverture CI | PASS |

La couverture globale mesuree apres ce lot atteint 13,68 % des lignes, 50,59 % des
branches et 30,47 % des fonctions. Le Lot 8B ajoute surtout une couverture navigateur :
elle ne gonfle pas artificiellement les pourcentages Jest.

## Smoke test reel

Le runner refuse de s'executer sans `LOT8B_CONFIRM_REAL_DEV=1`, sur un projet autre que
`location-maison-dev`, contre les emulateurs, ou avec une URL non locale. Il exige un
compte annonceur au profil complet et dont l'UID correspond a l'ID du document utilisateur.

Chaque execution cree un titre unique. Le bloc `finally` supprime les annonces restantes
et les chemins Storage releves dans le document, meme si une assertion echoue. Les trois
premiers essais interrompus ont aussi ete nettoyes : six fichiers temporaires ont ete
supprimes et aucun artefact Lot 8B ne subsiste.

## Commandes

```bash
cd apps/location-maison

npm run test:e2e:lot8b
npm run check:types
npm run test:ci

LOT8B_CONFIRM_REAL_DEV=1 \
LOT8B_USER_EMAIL=<compte-annonceur-dev> \
LOT8B_BASE_URL=http://localhost:3001 \
npm run test:smoke:lot8b
```

## Risque residuel

Le smoke test utilise un vrai compte, Firestore et Storage dev, mais pas Gemini, la
moderation humaine ni un paiement. Les comparaisons visuelles fines entre les douze
variantes restent du ressort de l'audit artistique global ; ce lot verrouille surtout
leur fonctionnement, leur ergonomie de saisie et leur accessibilite structurelle.
