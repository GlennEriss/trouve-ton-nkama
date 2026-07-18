# Plan de tests - Trouve Ton Nkama

Derniere mise a jour : 2026-07-18

Ce plan sert de feuille de route qualite pour tester la plateforme sans tout melanger. On commence par le metier et les Cloud Functions, puis on monte progressivement vers les API, les parcours utilisateurs, l'UX mobile et la coherence visuelle.

## Objectifs

- Eviter les regressions sur les regles metier critiques : credits, paiements, cadeaux, reels, annonces, telephone, publicites.
- Tester les Cloud Functions avec des mocks et, quand utile, les emulators Firebase.
- Verifier les parcours reels des utilisateurs : creation, modification, suppression, recherche, filtres, publicites, cadeaux.
- Identifier les murs UX : boutons qui creent deux fois, champs confus, navigation incoherente, bottom navigation qui cache du contenu.
- Controler les couts Firebase : lectures repetees, refresh abusif, listeners trop larges, absence d'idempotence.
- Garder une coherence artistique sur mobile et desktop avant de demarcher plus d'annonceurs.

## Strategie par lots

### Lot 0 - Baseline qualite

But : savoir d'ou on part avant de corriger massivement.

- Lister les pages principales et leur statut dev/prod.
- Lister les collections Firestore critiques et les fonctions qui ecrivent dedans.
- Verifier les scripts de test existants et les configurations Jest/Playwright.
- Noter les dettes bloquantes : page `/gifts` en prod, publicites AdSense en reels, idempotence creation annonce/reel, navigation mobile.

Sortie attendue : cartographie des risques et commandes de test fiables.

### Lot 1 - Fonctions metier et Cloud Functions sans UI

But : tester les regles qui doivent rester vraies meme sans navigateur.

Domaines prioritaires :

- Credits : valeur FCFA estimee, prix par credit, packs actifs/inactifs, affichage des prix.
- Telephone : validation Gabon, normalisation `+241`, retrait du premier `0` local quand necessaire.
- Paiements et cadeaux : commission, bornes de montant, hash callback MyPayGa, reseau Airtel/Moov, telephone Mobile Money.
- Reels : validateurs purs, contraintes de creation, description facultative, rattachement annonce facultatif.
- Annonces : valeurs par defaut, normalisation champs, prevention des doublons cote service.
- Publicites first-party : validation du lien, credits requis, ratios recommandes par placement, duree de campagne.

Commandes cibles :

```bash
cd apps/location-maison && npm test -- --runInBand --coverage=false __tests__/lib
cd apps/location-maison/functions && npm test -- --runInBand __tests__/payments
```

Critere de sortie :

- Les tests unitaires metier passent en local.
- Les helpers critiques sont couverts par au moins un test de cas nominal et un test de bord.
- Les ecarts trouves sont soit corriges, soit notes comme dette de lot suivant.

### Lot 2 - Couts Firebase, idempotence et securite

But : eviter les doubles creations, les doubles debits et les factures inutiles.

- Tester les boutons soumis plusieurs fois : reels, annonces, publicites, credits, cadeaux.
- Verifier les idempotency keys sur creations et callbacks de paiement.
- Auditer les listeners Firestore : pagination, limites, unsubscribe, cache, refresh.
- Tester les regles Firestore/Storage en emulator : create/update/delete par role.
- Verifier que les UID utilisateurs et les IDs de documents restent coherents.

Commandes cibles :

```bash
cd apps/location-maison && npm run test:rules
```

Critere de sortie :

- Aucun parcours critique ne peut creer deux objets identiques par double clic.
- Les callbacks paiement repetes ne creditent/debitent pas deux fois.
- Les requetes listees sont limitees et paginees.

### Lot 3 - Tests API et integration

But : tester les contrats serveur sans passer par toute l'UI.

- API annonces : creation, modification, suppression, validation erreurs.
- API reels : upload metadata, stats vues/likes/partages, suppression.
- API publicites : brouillon, apercus, paiement credits, publication.
- API gifts : rendu page, listing utilisateur, paiement, callback.
- Recherche/filtres : parametres, pagination, empty states.

Commandes cibles :

```bash
cd apps/location-maison && npm test -- --runInBand --coverage=false __tests__/api
```

Critere de sortie :

- Les routes critiques ont un test nominal, un test non connecte et un test permission refusee.
- Les erreurs sont exploitables et affichables cote client.

### Lot 4 - Parcours utilisateurs Playwright

But : verifier que les utilisateurs ne se cognent pas a des murs.

Parcours prioritaires mobile d'abord :

- Visiteur mobile : accueil, recherche, details annonce, bottom navigation, connexion.
- Annonceur : creation annonce, reset formulaire, IA formulaire, publication.
- Reels : feed, like, WhatsApp, appel, cadeau, partage, son, creation, retour depuis `/reels/mine`.
- Mes reels : stats, modification, suppression avec confirmation.
- Publicites : liste `/advertising`, creation `/advertising/create`, apercus Recherche/Immobilier/Reels, paiement credits.
- Gifts : page `/gifts`, listing, etats vides et erreurs.

Critere de sortie :

- Les parcours passent sur petit mobile, mobile standard et desktop.
- Les elements fixes ne cachent pas les actions principales.
- Les pages principales rendent la bonne vue en dev et prod.

### Lot 5 - Audit UX, accessibilite et coherence artistique

But : corriger l'impression de plateforme "patchwork".

- Revoir les boutons : formes, couleurs, hauteur, icones, ordre, libelles, etats disabled/loading.
- Revoir les formulaires : champs telephone separes, placeholders, erreurs, focus, claviers mobiles.
- Revoir la bottom navigation : espace bas, zones tactiles, coherence connecte/non connecte.
- Revoir les pages hors contexte : `/reels/add`, `/property`, `/advertising/create`, `/gifts`.
- Verifier accessibilite : labels, contrastes, navigation clavier, touch targets.
- Faire screenshots Playwright avant/apres sur mobile et desktop.

Critere de sortie :

- Une grille de composants coherente est appliquee aux pages majeures.
- Aucune action principale n'est masquee ou difficile a atteindre sur mobile.

### Lot 6 - Publicites, monitoring et regression continue

But : suivre la prod sans attendre les retours utilisateurs.

- In-app ads : fake campaigns en dev, campagnes actives en prod, rendu Recherche/Details/Reels.
- AdSense : en dev, utiliser uniquement des emplacements de test ou mocks visuels. En prod, smoke test sans cliquer les pubs.
- Stats reels/publicites : vues, likes, partages, impressions, clics.
- Logs : erreurs creation reel, traitement video, callbacks paiement, API failed.
- CI : lancer Lot 1 et Lot 3 a chaque PR, Lot 4 sur branches de release.

Critere de sortie :

- Les pubs first-party sont testables en dev sans attendre AdSense.
- Les erreurs prod critiques sont visibles dans les logs et reliees a une action corrective.

## Matrice de risques

| Risque | Impact | Premier lot |
| --- | --- | --- |
| Double creation annonce/reel | Donnees dupliquees, couts et confusion | Lot 2 |
| Callback paiement rejoue | Perte financiere directe | Lot 1 puis Lot 2 |
| Mauvaise normalisation telephone | Prospects impossibles a joindre | Lot 1 |
| Bottom navigation masque les CTA | Blocage mobile | Lot 4 puis Lot 5 |
| Publicite reels mal dimensionnee | Client annonceur decu | Lot 3 puis Lot 5 |
| AdSense blanc en reels | Revenus manques, design casse | Lot 6 |
| Page prod qui ne rend pas | Perte de confiance et SEO | Lot 3 puis Lot 4 |
| Formulaire IA regressif | Annonces mediocres, friction | Lot 1 puis Lot 4 |

## Definition of Done qualite

Une fonctionnalite est consideree prete quand :

- Les regles metier associees ont au moins un test automatise.
- Les erreurs attendues sont gerees avec un message clair.
- Les actions de creation/paiement sont idempotentes ou protegees contre le double clic.
- Le parcours mobile a ete verifie visuellement.
- Les couts Firebase sont limites par pagination, cache ou debouncing quand necessaire.
- Les regressions connues sont documentees si elles ne sont pas corrigees dans le lot.
