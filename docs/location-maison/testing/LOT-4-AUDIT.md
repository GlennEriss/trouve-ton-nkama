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

## Corrections appliquees pendant le lot

- Ajout d'un landmark accessible `Navigation mobile` sur la bottom navigation pour stabiliser les tests et ameliorer l'accessibilite.
- Configuration Playwright avec `NEXT_IGNORE_INCORRECT_LOCKFILE=1` pour eviter l'overlay Next lie au lockfile npm en `install-strategy=nested`.
- Geolocalisation passive : les echecs navigateur sont maintenant logs en `warn`, pas en `error`, car un refus ou une indisponibilite GPS est un cas normal.
- Navigation Playwright : attente `domcontentloaded` puis verification des elements UI, au lieu d'attendre `load` qui peut rester bloque par medias/scripts externes.
- Tests annonceur : mock des appels analytics, Meta CAPI, Firebase custom token et API annonces pour eviter les ecritures externes pendant les tests de navigation.
- Tests annonceur : masquage du bouton flottant Next Dev Tools dans le navigateur de test, car il recouvre le premier bouton de la bottom navigation mobile en dev.
- Tests 4C : factorisation de la fixture annonceur et limitation volontaire aux actions annulables tant que les ecritures Firestore client ne sont pas branchees sur emulator dans les tests E2E.

## Observations

- Les Lots 4A, 4B et 4C couvrent les murs mobiles les plus visibles : navigation invite, navigation annonceur, reels publics, retour depuis `Mes reels`, footer, CTA principaux, reset de formulaire, filtres et confirmations destructives.
- La creation/modification/suppression reelle d'annonces, reels, cadeaux et publicites n'est pas encore couverte par Playwright. Elle demandera des fixtures Firestore/emulator ou des routes API serveur plus testables.
- La gestion annonceur liste les annonces via `/api/announcer/ads`, mais les actions `Archiver` et `Supprimer` passent encore par Firestore client via `property.db`; c'est la raison pour laquelle 4C s'arrete au modal de confirmation.
- Le serveur dev lance plusieurs appels analytics/presence pendant les parcours accueil/reels. C'est a auditer dans les lots couts/monitoring pour limiter les ecritures Firebase inutiles.
- Les publicites AdSense restent a tester avec mocks visuels en dev et smoke test sans clic en prod.

## Suite recommandee

- Lot 4D : publicites `/advertising` et `/advertising/create`, paiement credits, apercus Recherche/Immobilier/Reels.
- Lot 4E : ecritures reelles avec emulator ou routes API dediees pour annonce/reel, y compris confirmation de suppression et anti double-clic jusqu'au commit.
- Lot 5 : revue artistique mobile/desktop avec screenshots avant-apres.
