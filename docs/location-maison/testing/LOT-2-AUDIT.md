# Lot 2 - Idempotence, couts Firebase et securite

Date : 2026-07-18

## Corrections faites

- Emulateur Firestore ajoute dans `apps/location-maison/firebase.json`.
- Publication publicitaire self-serve : ajout d'une cle d'idempotence obligatoire sur `/api/advertising/campaigns`.
- Wizard publicite : generation d'une cle stable par tentative de publication et envoi via header `Idempotency-Key`.
- Retrait cadeaux : creation de demande de retrait deplacee dans une transaction Firestore, avec recalcul du solde et verification d'une demande `EN_ATTENTE` dans la meme transaction.
- Verification de code credit : validation du code, marquage `success`, credit utilisateur et transaction d'achat sont maintenant atomiques.
- `firestore.rules` resserrees : un utilisateur ne peut plus creer/mettre a jour son profil avec des credits arbitraires ni s'attribuer un role sensible cote client.

## Tests ajoutes

- Helpers d'idempotence serveur : normalisation, hash payload, cloisonnement par scope/utilisateur.
- Calculateur de solde cadeaux : retraits en attente, retraits traites, retraits refuses et montants invalides.
- Route `/api/advertising/campaigns` : cle obligatoire, rejeu avec la meme cle, et stockage de la reponse idempotente.
- Firestore rules via emulateur : profils, creation profil, credits, annonces, reels, cadeaux/retraits, pubs et cles idempotence.

## Audit rapide couts Firebase

- `getCreditHistoryByUserId` est pagine (`limit + 1`) et limite le cout par page.
- `getCreditTransactionStats` relit toutes les transactions utilisateur pour calculer les totaux. Risque cout si un utilisateur a beaucoup d'historique. A migrer plus tard vers des compteurs agreges ou une Cloud Function de projection.
- `deriveGiftBalance` et le retrait cadeaux relisent toutes les demandes de retrait de l'annonceur. Acceptable pour le volume actuel, mais a migrer vers une projection si les cadeaux montent fort.
- Les tests rules passent via `npm run test:rules` depuis `apps/location-maison` : 18 tests passes avec l'emulateur Firestore.

## Reste a faire dans le lot 2

- Ajouter des tests route/API avec mocks pour `/api/credits/verify-code` et `/api/gifts/withdrawals`.
- Auditer les refresh/listeners cote client avec captures reseau Playwright pendant les parcours mobile.
