# Lot 9 — raccordement paiement et modération

29 octobre 2026. **Code implémenté et testé localement ; non déployé, débit réel non testé.** Cette page et `ACCES-ANONYME.md` remplacent les anciennes hypothèses d'authentification obligatoire de l'architecture initiale.

## Parcours livré

Deux étapes de saisie inchangées → vérification → modale du réseau et téléphone payeur → paiement 200 FCFA → confirmation serveur → PENDING → décision administrateur. Le contact public reste distinct du téléphone payeur privé. Aucun compte obligatoire ni utilisateur fictif créé.

Le suivi reprend après rechargement grâce à un secret aléatoire de 256 bits conservé dans le stockage local. Il n'est ni placé dans une URL ni enregistré en clair dans Firestore. Le serveur utilise son SHA-256 comme référence. Ne pas partager ce secret ; effacer le stockage du navigateur fait perdre le suivi automatique. Une référence publique d'opération est affichée après récupération du statut pour contacter le support.

Une opération est bloquée pendant sa résolution : fermer la modale n'annule pas le paiement. Après un échec signé ou un résultat indéterminé, l'interface ne propose pas de nouveau débit automatique ; le suivi et le contact support restent possibles. Une nouvelle annonce peut être commencée après confirmation. Aucun remboursement automatique.

## Backend et sécurité

- `POST /api/quick-listings/initiate` : origine navigateur contrôlée, payload strict, montant serveur 200, géographie vérifiée sur la source OSM existante, téléphone payeur validé par réseau.
- Réservation atomique `quick_listings` + `quick_listing_payments`. Aucun champ financier privé sur le document public.
- Même secret/même payload : même opération ; autre payload : 409. Quotas transactionnels : 3 réservations par numéro/heure, plafond global de 200/heure. Ces limites conservatrices doivent être réévaluées sur les volumes réels ; elles ne remplacent pas une protection périmétrique anti-bot.
- Appel à `initiateQuickListingPayment` avec ticket serveur privé haché, valide 15 minutes. Une transaction acquiert une seule fois le droit d'appeler le fournisseur ; aucun retry du débit.
- `quickListingPaymentCallback` réutilise parsing/HMAC SHA-512/comparaison constante existants. Montant strictement 200 et token fournisseur cohérent lorsqu'il est connu. Seul un statut signé autorise la confirmation, pas `status_request` non signé ni une correspondance approximative du message.
- Un rejeu ne modifie pas une décision administrateur. Échec tardif ne dégrade pas confirmed ; succès signé tardif peut résoudre un failed. Suppression/archivage ne ressuscite pas l'annonce.
- `GET /api/quick-listings/payments/status` : secret en Authorization, DTO minimal statut/référence, no-store. Accessible même si les nouvelles initiations sont désactivées.
- Rules : aucune écriture client ; lecture uniquement confirmed + APPROVED + IN_PROGRESS ; paiements, limites et notes admin privés.

Un crash après réservation mais avant appel, une fonction non déployée ou un refus HTTP non confirmé restent indéterminés : **rapprochement manuel**, pas supposition d'échec financier. Il n'existe pas encore de console de rapprochement spécifique. Les références privées permettent l'investigation administrateur.

## Modération et e-mail

Admin : `/dashboard/quick-listings-moderation`, navigation ajoutée. File bornée à 20 avec pagination. Autorisations IAM existantes `listings.read`, `listings.approve`, `listings.reject`. Décision transactionnelle sur annonce payée/PENDING/active ; publication datée à l'approbation ; motif et acteur dans `quick_listing_moderation` privé. Pas de notification de rejet au déposant ni d'édition anonyme dans ce lot.

`onQuickListingPendingNotifyAdmin` réutilise le transport et le mécanisme de bail/reprise/idempotence d'e-mail existant, avec lien vers la bonne file. Il respecte `ADMIN_MODERATION_EMAIL_ENABLED` et les secrets SMTP existants. Aucun mail réel envoyé pendant les tests. La configuration d'expédition/réception Gmail doit toujours être vérifiée avant activation ; ce lot ne la remplace pas.

## Déploiement et activation (à faire séparément)

1. Déployer les règles/index nécessaires et l'application admin ; attendre l'index de file PENDING.
2. Déployer les fonctions `initiateQuickListingPayment`, `quickListingPaymentCallback`, `onQuickListingPendingNotifyAdmin`. Secrets MyPayGa existants réutilisés ; callback dédié dérivé du projet de la Function.
3. Déployer le Web avec le bon `FIREBASE_PROJECT_ID`. Ne pas activer tant que les fonctions et la modération ne sont pas accessibles.
4. Vérifier en dev les clés **sandbox**, le callback, les réponses fournisseur et le contrat d'initiation, notamment l'acceptation sans e-mail payeur. Aucun e-mail fictif n'est envoyé au fournisseur et aucun champ supplémentaire n'a été ajouté à la saisie. La documentation fournisseur montre un champ e-mail dans ses exemples sans permettre ici de confirmer son caractère facultatif : si obligatoire, décider du recueil dans la modale avant activation, sans fabriquer d'adresse.
5. Activer `QUICK_LISTINGS_PAYMENTS_ENABLED=true` côté serveur Web uniquement après cette validation. Sans la variable, le bouton retourne explicitement « paiement temporairement indisponible », aucun document ni débit.
6. Test réel borné sur accord explicite avant généralisation. Surveiller les opérations indéterminées. Désactiver le flag arrête les nouvelles initiations, pas les callbacks/suivis en cours.

Référence fournisseur consultée : [documentation MyPayGa](https://developer.mypayga.com/) pour l'initiation et les champs signés du callback. Aucun appel de débit fournisseur exécuté pendant ce développement.

## Vérifications

- Web : 12 suites ciblées, 84 tests réussis (formulaire, API, suivi, catalogue, middleware et régression demandes).
- Functions : 5 suites, 60 tests réussis (paiement rapide, MyPayGa existant, alertes).
- Admin : 4 tests de droits, approbation/rejeu, impayé/archivé et motif privé.
- Rules sur émulateur isolé `demo-quick-lot9` : 29 tests réussis.
- Persistance réelle sur le même émulateur : 1 test, callbacks concurrents et tardifs ; une annonce + un paiement créés puis supprimés, absence vérifiée.
- Playwright : 2 parcours (390px et 1440px), APIs paiement simulées, aucune écriture distante. Modale mobile inspectée visuellement.
- TypeScript Web/Admin et compilation Functions vérifiés ; pas de build de production ni de déploiement dans ce lot.
- Lint ciblé des nouveaux fichiers admin : réussi. Aucun script lint Web/Functions configuré. Total : 178 tests Jest sur 20 suites, plus 2 parcours navigateur.

Commandes depuis `apps/location-maison` :

```sh
npx jest --config jest.quick-admin.config.cjs --runInBand
npx playwright test --config playwright.quick-payment.config.ts
firebase emulators:exec --config firebase.quick-tests.json --project demo-quick-lot9 --only firestore 'GCLOUD_PROJECT=demo-quick-lot9 FIREBASE_PROJECT_ID=demo-quick-lot9 npx jest --config jest.rules.config.ts __tests__/rules/firestore.rules.test.ts --runInBand --coverage=false'
firebase emulators:exec --config firebase.quick-tests.json --project demo-quick-lot9 --only firestore 'GCLOUD_PROJECT=demo-quick-lot9 npx jest --config functions/jest.config.js functions/__tests__/payments/quick-listings.emulator.test.ts --runInBand --coverage=false'
```

Playwright attend un serveur local sur 3002, sans teardown Firebase global. Les tests ne valident pas un vrai débit MyPayGa. Factures et remboursement restent au lot 12, comme demandé.
