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

### Baseline couverture

La baseline de couverture mesuree le 2026-07-18 est documentee dans [COVERAGE-BASELINE.md](./COVERAGE-BASELINE.md).

- App Next.js : statements 7.54 %, branches 37.11 %, functions 15.63 %, lines 7.54 %.
- Cloud Functions : statements 15.45 %, branches 14.57 %, functions 16.86 %, lines 15.74 %.

Decision : ne pas activer tout de suite un seuil global a 70 % ou 80 %. Une garde de baseline basse est activee pour empecher une regression, puis on protegera les zones critiques avec des seuils locaux avant de remonter progressivement le global.

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

Commande Lot 4A deja automatisee :

```bash
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-public.spec.ts
```

Couverture Lot 4A : parcours publics anonymes sur mobile, bottom navigation invite, routes protegees, footer, creation de reel publique, feed reels, partage et fin de feed.

Commande Lot 4B deja automatisee :

```bash
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-announcer.spec.ts
```

Couverture Lot 4B : session annonceur mockee avec cookie NextAuth, `/publish`, bottom navigation connectee, `/property`, actions annonceur principales, `/reels/mine` et retour `returnTo` depuis la creation de reel.

Commande Lot 4C deja automatisee :

```bash
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-crud.spec.ts
```

Couverture Lot 4C : reset du formulaire `/property/add/studio`, filtres annonceur, nettoyage du prix minimum, reset des filtres et modals annulables pour `Archiver`/`Supprimer`. Ce sous-lot est non destructif : il ne confirme pas encore les ecritures Firestore.

Commande Lot 4D deja automatisee :

```bash
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-advertising.spec.ts
```

Couverture Lot 4D : dashboard publicitaire, wizard `/advertising/create`, valeur FCFA des credits, upload image mocke, warning format Reels, lien au clic obligatoire, apercus Recherche/Immobilier/Reels et POST de publication mocke avec idempotence.

Commande Lot 4E deja automatisee :

```bash
cd apps/location-maison && npm run test:emulator:api
```

Couverture Lot 4E : routes critiques avec Firestore emulator, credits par code, rejeu concurrent de paiement, promotion `boost` idempotente, publication publicitaire idempotente, creation/modification/suppression de reel et verification des documents Firestore produits.

Commande de regression mobile Lot 4A + Lot 4B + Lot 4C + Lot 4D :

```bash
cd apps/location-maison && npx playwright test --project=chromium-mobile __tests__/e2e/lot4-mobile-public.spec.ts __tests__/e2e/lot4-mobile-announcer.spec.ts __tests__/e2e/lot4-mobile-crud.spec.ts __tests__/e2e/lot4-mobile-advertising.spec.ts
```

Dernier resultat local : 15 tests passes en 34.6s.
Dernier resultat Lot 4E emulator : 4 tests passes en 10.96s.
Dernier resultat rules : 18 tests passes en 4.547s.

Critere de sortie :

- Les parcours passent sur petit mobile, mobile standard et desktop.
- Les elements fixes ne cachent pas les actions principales.
- Les pages principales rendent la bonne vue en dev et prod.
- Les ecritures serveur critiques passent au moins une fois contre Firestore emulator avant un smoke test dev heberge.

### Smoke test dev avec vrais credits de dev

But : valider la chaine complete hors mock avec un compte annonceur de dev et des credits non prod.

- Creer ou selectionner un compte annonceur dev.
- Crediter ce compte via un code de paiement/dev-code controle.
- Publier une publicite self-serve avec un petit forfait et verifier le debit dans Firebase dev.
- Promouvoir une annonce avec `boost` et verifier le debit unique.
- Creer, modifier et supprimer un reel dev court.
- Noter les IDs de documents crees et nettoyer les donnees de test.

Critere de sortie :

- Les soldes visibles dans l'UI correspondent aux soldes Firestore dev.
- Aucun debit double n'apparait apres double clic ou refresh.
- Les donnees de test sont nettoyees apres verification.

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

Lot 5A automatise le 2026-07-18 :

```bash
cd apps/location-maison
npm run test:e2e:lot5
```

Resultat : 8 tests passes sur mobile et desktop. Le detail des controles, corrections et captures est documente dans [LOT-5-AUDIT.md](./LOT-5-AUDIT.md).

Regression associee : TypeScript sans erreur, 21 tests API/services passes, 4 tests Firestore emulator passes et 15 parcours Playwright du Lot 4 passes.

Lot 5B automatise le 2026-07-18 :

```bash
cd apps/location-maison
npm run test:e2e:lot5b
```

Couverture Lot 5B : formulaire studio, profil, informations personnelles, historique/recharge de credits, connexion et inscription, sur mobile/desktop et en themes clair/sombre. Les controles incluent Axe/WCAG, navigation clavier, cibles tactiles, debordements, bottom navigation et mouvement reduit.

Resultat : 28 tests passes. Validation associee : TypeScript sans erreur, 26 tests API/services passes, Lot 5A a 8/8 et regression mobile Lot 4 a 15/15. Le detail et les captures sont documentes dans [LOT-5-AUDIT.md](./LOT-5-AUDIT.md).

### Lot 6 - Publicites, monitoring et regression continue

But : suivre la prod sans attendre les retours utilisateurs.

- In-app ads : fake campaigns en dev, campagnes actives en prod, rendu Recherche/Details/Reels.
- AdSense : en dev, utiliser uniquement des emplacements de test ou mocks visuels. En prod, smoke test sans cliquer les pubs.
- Stats reels/publicites : vues, likes, partages, impressions, clics.
- Logs : erreurs creation reel, traitement video, callbacks paiement, API failed.
- CI : lancer Lot 1 et Lot 3 a chaque PR, Lot 4 sur branches de release, et publier la couverture sans casser la CI tant que les seuils cibles locaux ne sont pas poses.

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
- La couverture ne descend pas sous la baseline acceptee, ou la baisse est justifiee dans la PR.
- Les regressions connues sont documentees si elles ne sont pas corrigees dans le lot.
