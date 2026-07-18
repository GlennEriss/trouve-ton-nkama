# Lot 3 - Tests API et integration

Date : 2026-07-18

## Corrections et tests ajoutes

- Credits `/api/credits/verify-code` : token obligatoire, code introuvable, montant incoherent, utilisateur introuvable, validation transactionnelle et rejeu concurrent.
- Cadeaux `/api/gifts/withdrawals` : token obligatoire, validation body, validation reseau/numero, solde minimum, retrait deja en attente, creation transactionnelle du retrait integral.
- Cadeaux `/api/gifts/summary` : token obligatoire, solde derive, historique des dons/retraits, masquage des numeros donateurs.
- Publicites `/api/advertising/campaigns` : idempotence, lien au clic obligatoire, lien invalide, visuel manquant, credits insuffisants, listing et expiration paresseuse.
- Reels `/api/reels` : creation orpheline avec description, rejet du meme `reelId`, modification details, refus autre proprietaire, suppression et nettoyage Storage.
- Stats reels `/api/reels/[reelId]/statistics/*` : vues, like/unlike, partage, normalisation cible et erreurs compteur.
- Annonces `/api/property/promote` : session obligatoire, validation, debit credits, refus autre proprietaire, promotion deja active, credits insuffisants.
- Annonces `/api/property/id` : id obligatoire, cache hit, annonce non approuvee masquee, annonce publique mise en cache.

## Resultat

Commande :

```bash
cd apps/location-maison && npm test -- --runInBand --coverage=false __tests__/api
```

Resultat : 8 suites passees, 45 tests passes.

## Points notes

- La creation/modification/suppression classique d'annonce ne semble pas exposee via une route API dediee dans `src/app/api/property`; elle passe par les services client/Firestore et les regles. Elle doit etre verifiee en parcours Playwright au Lot 4.
- Les tests API utilisent des mocks Admin SDK/Firestore pour valider les contrats serveur. Les permissions Firestore reelles sont couvertes separement par l'emulateur au Lot 2.
- Les endpoints recherche/filtres et listing avance restent a etendre si on veut aller plus loin dans le Lot 3 avant de passer au Lot 4.
