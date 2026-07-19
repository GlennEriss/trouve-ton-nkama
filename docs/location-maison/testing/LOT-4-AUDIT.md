# Lot 4 - Parcours mobile Playwright

Date : 2026-07-18

## Lot 4A - Couverture publique automatisee

- Visiteur mobile : bottom navigation invite visible sur l'accueil, liens Accueil/Recherche/Publier/Reels/Connexion presents, navigation vers Reels puis Connexion.
- Routes protegees : `/reels/mine` et `/property` redirigent vers `/signin` avec `callbackUrl`.
- Footer mobile invite : le copyright reste au-dessus de la bottom navigation sur `/terms-of-use`, sans overflow horizontal.
- Creation de reel publique : `/reels/add?returnTo=%2Freels` reste accessible sans connexion, masque la bottom navigation et respecte le retour vers `/reels`.
- Feed reels mobile : ordre des boutons valide, zones tactiles >= 44px, menu de partage expose WhatsApp, Facebook, X, Mail, TikTok et copie du lien.
- Fin de feed reels : affichage du message de creation et du bouton "Creer un reel".

## Commande

```bash
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-public.spec.ts
```

Resultat du run a froid : 6 tests passes en 34.1s.

## Lot 4B - Couverture annonceur automatisee

- Session annonceur mobile : fixture NextAuth via cookie `authjs.session-token`, role `Announcer`, sans dependance a une vraie connexion UI.
- Page `/publish` connectee : bottom navigation annonceur visible, items Annonces/Recherche/Publier/Reels/Profil presents, Connexion absent.
- Page `/publish` connectee : les CTA pointent vers `/property/add` et `/reels/select-property`.
- Navigation annonceur : clic bottom nav `Annonces` vers `/property`.
- Page `/property` : rendu de l'espace annonceur, stats, recherche, compteur, annonce mockee et actions Voir/Modifier/Ajouter un reel.
- Page `/reels/mine` : bouton `Nouveau reel` vers `/reels/add?returnTo=%2Freels%2Fmine`, formulaire sans bottom nav, retour vers `/reels/mine`.

## Commandes Lot 4B et combinees

```bash
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-announcer.spec.ts
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-public.spec.ts __tests__/e2e/lot4-mobile-announcer.spec.ts
```

Resultat Lot 4B : 3 tests passes en 5.3s.
Resultat combine Lot 4A + Lot 4B : 9 tests passes en 8.6s.

## Lot 4C - Couverture CRUD non destructive

- Creation annonce : `/property/add/studio` rend le formulaire studio, expose le bouton `Suivant` et le bouton `Réinitialiser`.
- Reset formulaire : le bouton `Réinitialiser` ouvre un modal de confirmation explicite et annulable.
- Gestion annonces : la recherche annonceur déclenche bien une requete `/api/announcer/ads` avec le parametre `q`.
- Gestion annonces : le champ `Prix min` nettoie les caracteres non numeriques.
- Gestion annonces : `Réinitialiser` vide la recherche et les prix.
- Actions sensibles : `Archiver` et `Supprimer` passent par un modal de confirmation annulable avant toute action destructive.

## Commandes Lot 4C et regression Lot 4

```bash
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-crud.spec.ts
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-public.spec.ts __tests__/e2e/lot4-mobile-announcer.spec.ts __tests__/e2e/lot4-mobile-crud.spec.ts
```

Resultat Lot 4C : 3 tests passes en 21.9s.
Resultat combine Lot 4A + Lot 4B + Lot 4C : 12 tests passes en 58.5s.

## Lot 4D - Couverture publicites

- Dashboard `/advertising` : credits annonceur, stats, campagnes, vues/clics/credits utilises et CTA de creation.
- Wizard `/advertising/create` : valeur FCFA visible a cote des credits, progression mobile et navigation entre etapes.
- Visuels : upload image publicitaire mocke via `/api/advertising/upload`.
- Reels : warning `Format vertical recommandé pour Réels` quand le visuel paysage est utilise sur un placement vertical.
- Message : le lien au clic est obligatoire et bloque l'etape suivante tant qu'il est absent ou invalide.
- Apercus : rendu des emplacements Recherche, Immobilier et Reels dans le wizard.
- Publication : POST `/api/advertising/campaigns` mocke, verification de la cle d'idempotence, du forfait, du CTA normalise et du visuel.
- Anti double-clic : deux clics rapides sur `Payer & publier` ne declenchent qu'une seule requete de creation.

## Commandes Lot 4D et regression Lot 4

```bash
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-advertising.spec.ts
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-public.spec.ts __tests__/e2e/lot4-mobile-announcer.spec.ts __tests__/e2e/lot4-mobile-crud.spec.ts __tests__/e2e/lot4-mobile-advertising.spec.ts
```

Resultat Lot 4D : 3 tests passes en 19.5s.
Resultat combine Lot 4A + Lot 4B + Lot 4C + Lot 4D : 15 tests passes en 34.6s.
Derniere regression apres les corrections UX du Lot 5A : 15 tests passes en 42.1s.

## Lot 4E - Ecritures reelles avec Firestore emulator

- Credits : validation concurrente d'un code de paiement, credit utilisateur applique une seule fois, code marque `success` et transaction d'achat creee.
- Promotion annonce : double requete `boost` avec la meme cle d'idempotence, debit applique une seule fois, annonce promue et transaction de depense creee.
- Publicites : double publication de campagne avec la meme cle d'idempotence, debit de credits applique une seule fois, campagne active creee, transaction et listing verifies.
- Reels : creation de reel orphelin, rejet du meme `reelId` rejoue, modification contact/description, suppression idempotente.

## Commandes Lot 4E

```bash
cd apps/location-maison && npm run test:emulator:api
cd apps/location-maison && npx jest --config jest.config.ts --runInBand --coverage=false __tests__/api/property-promote.test.ts __tests__/api/advertising-campaigns-idempotency.test.ts __tests__/api/credits-verify-code.test.ts
cd apps/location-maison && npm run test:rules
```

Resultat Lot 4E emulator : 4 tests passes en 11.061s lors de la derniere regression.
Resultat API ciblee : 21 tests passes en 0.568s.
Resultat rules : 18 tests passes en 4.547s.

## Corrections appliquees pendant le lot

- Ajout d'un landmark accessible `Navigation mobile` sur la bottom navigation pour stabiliser les tests et ameliorer l'accessibilite.
- Configuration Playwright avec `NEXT_IGNORE_INCORRECT_LOCKFILE=1` pour eviter l'overlay Next lie au lockfile npm en `install-strategy=nested`.
- Geolocalisation passive : les echecs navigateur sont maintenant logs en `warn`, pas en `error`, car un refus ou une indisponibilite GPS est un cas normal.
- Navigation Playwright : attente `domcontentloaded` puis verification des elements UI, au lieu d'attendre `load` qui peut rester bloque par medias/scripts externes.
- Tests annonceur : mock des appels analytics, Meta CAPI, Firebase custom token et API annonces pour eviter les ecritures externes pendant les tests de navigation.
- Tests annonceur : masquage du bouton flottant Next Dev Tools dans le navigateur de test, car il recouvre le premier bouton de la bottom navigation mobile en dev.
- Tests 4C : factorisation de la fixture annonceur et limitation volontaire aux actions annulables tant que les ecritures Firestore client ne sont pas branchees sur emulator dans les tests E2E.
- Publicites : l'upload image self-serve passe par `/api/advertising/upload`, ce qui rend le parcours testable et garde l'ecriture Storage cote serveur.
- Publicites : ajout d'un verrou synchrone sur `Payer & publier` pour eviter deux creations/debits si l'annonceur clique plusieurs fois rapidement.
- Promotions : ajout d'une idempotence serveur optionnelle sur `/api/property/promote`, envoyee par `usePromotion`, pour proteger les promotions instantanees comme `boost`.
- Reels rattaches : ajout d'un verrou synchrone client pendant l'envoi pour eviter deux creations si deux actions partent avant la mise a jour React.
- Tests : ajout de `npm run test:emulator:api` pour executer les routes critiques contre Firestore emulator.

## Observations

- Les Lots 4A a 4E couvrent les murs mobiles les plus visibles et les ecritures serveur critiques : navigation invite, navigation annonceur, reels publics, retour depuis `Mes reels`, footer, CTA principaux, reset de formulaire, filtres, confirmations destructives, creation publicitaire self-serve, credits, promotions, publicites et reels via emulator.
- La creation/modification/suppression reelle d'annonces et cadeaux n'est pas encore couverte par Playwright. Elle demandera des fixtures Firestore/emulator ou des routes API serveur plus testables.
- La gestion annonceur liste les annonces via `/api/announcer/ads`, mais les actions `Archiver` et `Supprimer` passent encore par Firestore client via `property.db`; c'est la raison pour laquelle 4C s'arrete au modal de confirmation.
- Le paiement publicitaire est teste avec POST mocke en 4D et avec Firestore emulator en 4E. Aucun credit prod/dev heberge n'est debite. Un smoke test dev avec vrais credits de dev reste a prevoir avant les tests prod.
- Les doubles requetes concurrentes peuvent produire des warnings `Transaction lock timeout` dans Firestore emulator, mais les assertions verifient l'etat final : un seul credit/debit et un seul document metier.
- Le serveur dev lance plusieurs appels analytics/presence pendant les parcours accueil/reels. C'est a auditer dans les lots couts/monitoring pour limiter les ecritures Firebase inutiles.
- Les publicites AdSense restent a tester avec mocks visuels en dev et smoke test sans clic en prod.

## Suite recommandee

- Smoke test dev credits reels : compte annonceur dev, recharge/dev-code, publication pub, promotion boost et verification du solde dans Firebase dev.
- Lot 5 : revue artistique mobile/desktop avec screenshots avant-apres.
