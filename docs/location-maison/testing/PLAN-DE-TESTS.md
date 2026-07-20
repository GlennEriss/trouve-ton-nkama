# Plan de tests - Trouve Ton Nkama

Derniere mise a jour : 2026-07-19

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
Dernier resultat Lot 4E emulator : 5 tests passes, dont la diffusion publicitaire Lot 6B.
Dernier resultat rules : 18 tests passes en 4.547s.

Critere de sortie :

- Les parcours passent sur petit mobile, mobile standard et desktop.
- Les elements fixes ne cachent pas les actions principales.
- Les pages principales rendent la bonne vue en dev et prod.
- Les ecritures serveur critiques passent au moins une fois contre Firestore emulator avant un smoke test dev heberge.

### Lot 6A - Smoke test dev avec vrais credits de dev

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

Commande automatisee :

```bash
cd apps/location-maison
LOT6A_CONFIRM_REAL_DEV=1 \
LOT6A_USER_EMAIL=<compte-annonceur-dev> \
LOT6A_BASE_URL=http://127.0.0.1:3001 \
npm run test:smoke:lot6a
```

Le runner refuse tout projet autre que `location-maison-dev`, tout serveur non local et toute connexion aux emulateurs. Il publie une campagne `discovery` a 15 credits et un boost a 3 credits, rejoue les deux requetes en concurrence, verifie Firestore et les API de solde/historique, puis restaure le solde et supprime les documents crees.

Dernier resultat reel le 2026-07-19 : PASS. Solde `200 -> 182 -> 200`, une campagne, un boost et deux transactions uniques, puis zero document de test restant. Le passage a revele l'index manquant `credit_transactions(type, uid, createdAt desc)` ; il a ete ajoute a `firestore.indexes.json`, deploye sur dev puis synchronise en production avant le Lot 6B. Detail dans [LOT-6-AUDIT.md](./LOT-6-AUDIT.md).

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

Lot 5C automatise le 2026-07-18 :

```bash
cd apps/location-maison
npm run test:e2e:lot5c
npm run test:e2e:lot5c:screenshots
```

Couverture Lot 5C : accueil, recherche, choix du type d'annonce, publication, favoris, notifications, connexion/securite, parametres, mes reels et fil de reels. La matrice couvre mobile/desktop et clair/sombre, soit 40 scenarios.

Resultat : 40 tests passes. Les tests ont revele puis verrouille les noms accessibles, contrastes, labels de dates, cibles tactiles, titres desktop, etats vides et interactions imbriquees. Validation associee : 39 tests API/services, Lot 5A a 8/8, Lot 5B a 28/28 et Lot 4 mobile a 15/15. Les 40 captures et le detail des corrections sont documentes dans [LOT-5-AUDIT.md](./LOT-5-AUDIT.md).

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

### Lot 6B - Diffusion first-party et comportement AdSense

Perimetre automatise le 2026-07-19 :

- API `/api/advertising/active` : validation des emplacements, ciblage, rotation sans cache et mode `all=1` cache court.
- API `/api/advertising/track` : impressions et clics, refus des campagnes inexistantes sans creation de document fantome.
- Firestore Emulator : campagne active, campagne expiree, campagne hors ciblage, visuel propre a Recherche/Reels et conservation des compteurs existants.
- Composants : coexistence pub maison + AdSense, aucune metrique maison sans campagne, impression unique lorsque la diapositive devient active.
- Reels : AdSense `unfilled` remplace par le CTA maison, insertion apres quatre reels, campagne first-party plein ecran apres les quatre reels suivants.
- Production : controles uniquement en lecture, sans cliquer une annonce reelle.

Commandes :

```bash
cd apps/location-maison
npm test -- --runInBand --coverage=false \
  __tests__/api/advertising-serving.test.ts \
  __tests__/components/advertising-serving.test.tsx
npm run test:emulator:ads
npm run test:e2e:lot6b
```

Important : en dev, les appels Google sont bloques et `data-ad-status=unfilled` est simule. En production, on peut verifier le chargement du slot et son repli, mais le remplissage commercial depend de Google, du consentement, du trafic et du navigateur ; les tests ne cliquent jamais une vraie publicite.

Dernier resultat : 11/11 API/composants, 1/1 Firestore Emulator cible, 1/1 Playwright et TypeScript sans erreur. La couverture ciblee des deux routes et deux composants de serving atteint 92,44 % des lignes, 73,07 % des branches et 100 % des fonctions.

### Lot 6C - Statistiques fiables et maitrise des ecritures

But : rendre les statistiques reels/publicites utiles a l'annonceur sans compter chaque
rafraichissement comme une nouvelle interaction ni multiplier les ecritures Firebase.

Perimetre :

- Identifiant visiteur persistant cote navigateur, transforme en empreinte SHA-256 cote serveur.
- Aucune adresse IP brute stockee ; une empreinte de requete sert uniquement de repli.
- Deduplication navigateur et serveur : vue reel 6 h, impression publicitaire 30 min,
  partage 10 s par cible et clic publicitaire 5 s.
- Etat like/unlike memorise et mutations rapides serialisees par reel.
- Reservation atomique des evenements via Redis SET NX EX ou transaction Firestore en repli.
- Suppression des lectures Firestore prealables aux increments de vues et partages.
- Verification de la concurrence et des compteurs reels avec Firestore Emulator.
- Affichage du taux de clic global et par campagne dans l'espace annonceur.

Commandes :

~~~bash
cd apps/location-maison
npx jest --config jest.config.ts --runInBand --coverage=false \
  __tests__/api/reel-statistics-routes.test.ts \
  __tests__/api/advertising-serving.test.ts \
  __tests__/components/advertising-serving.test.tsx \
  __tests__/components/advertising-dashboard.test.tsx \
  __tests__/components/advertising-shared.test.ts \
  __tests__/lib/statistics-actor.test.ts \
  __tests__/lib/statistics-visitor-client.test.ts \
  __tests__/lib/reel-statistics-client.test.ts \
  __tests__/lib/redis-cache-store.test.ts
npm run test:emulator:stats
npm run test:emulator:api
npm run test:e2e:lot6b
~~~

Dernier resultat le 2026-07-19 : 34/34 tests cibles, 2/2 scenarios statistiques
emulateur, regression emulateur 6/6, Playwright 1/1, suite Jest complete 200/200
et TypeScript sans erreur.
Couverture ciblee : 86,02 % lignes, 67,45 % branches et 86,11 % fonctions.
Detail dans [LOT-6-AUDIT.md](./LOT-6-AUDIT.md).

### Lot 6D - Observabilite et regression continue

Perimetre automatise le 2026-07-19 :

- logs structures et redaction des donnees sensibles;
- correlation `x-request-id` des routes critiques;
- codes d'incident pour reels, paiements, statistiques et cache;
- endpoint de sante sans lecture Firebase;
- CI application, regles Firestore, emulateur et Cloud Functions;
- monitoring production toutes les 30 minutes;
- smoke test sur Firebase dev reel avec nettoyage automatique;
- repli automatique Redis vers Firestore avec circuit de 60 secondes.

Dernier resultat : application 207/207, Functions 42/42, integration emulateur 6/6, regles Firestore PASS et smoke dev reel PASS. Upstash dev etait limite; le test a valide le repli Firestore, puis confirme zero donnee temporaire restante.

Couverture globale mesuree et publiee par la CI : 9,05 % des lignes application et 16,38 % des lignes Functions. Cette baseline est distincte de la couverture ciblee des modules du Lot 6C. La montee vers 70-80 % necessitera des lots de tests supplementaires sur les pages, composants et Functions historiques.

Runbook : [LOT-6D-RUNBOOK.md](./LOT-6D-RUNBOOK.md).

### Lot 6E - Mise en production controlee

Execute le 2026-07-19 hors Redis :

- application Vercel deployee et promue sur `www.tonnkama.com`;
- cache production force sur Firestore;
- trois Functions critiques deployees en dev puis en production;
- etat `ACTIVE` et runtime Node.js 22 verifies;
- `/api/health` et `/reels` verifies en HTTP 200;
- revisions Cloud Run demarrees avec sondes TCP reussies;
- aucun paiement ni transcodage utilisateur declenche par les tests.

Le workflow de monitoring est present localement. Il deviendra actif toutes les 30 minutes apres publication des changements sur GitHub et une premiere execution manuelle reussie.

### Lot 7 - Extension de couverture et seuils CI

Execute le 2026-07-19 en quatre sous-lots :

- 7A : 33 tests des Functions cadeaux et credits MyPayGa, incluant signatures,
  montants, erreurs fournisseur et idempotence ;
- 7B : 34 tests des transactions de credits et du client de donnees reels ;
- 7C : 19 tests des formulaires, hooks et composants sensibles, dont le double clic reel ;
- 7D : seuils globaux et locaux obligatoires, resumes GitHub Actions et rapport d'audit.

Resultat mesure : application 260 tests passes et 6 ignores, Functions 75 tests passes et
5 ignores. La couverture globale atteint 10,92 % des lignes application et 36,62 % des
lignes Functions. Les dix modules critiques du lot sont couverts entre 77,37 % et 100 %
des lignes, avec des seuils CI individuels entre 75 % et 95 %.

Le monitoring production manuel `29696611203` a egalement passe. Detail et commandes dans
[LOT-7-AUDIT.md](./LOT-7-AUDIT.md).

### Lot 8 - Couverture par domaine fonctionnel

But : faire progresser la couverture globale sans exclure artificiellement les pages
historiques, domaine par domaine, avec des seuils locaux exigeants sur chaque circuit traite.

#### Lot 8A - Annonces hors UI

Execute le 2026-07-19 :

- 57 tests cibles sur les 12 types d'annonces, constructeurs, schemas, images,
  localisations, CRUD, pagination, moderation et double clic ;
- 20/20 tests de regles Firestore, avec modification/suppression par le proprietaire et
  refus pour un autre utilisateur ;
- 6/6 scenarios de regression API avec Firestore Emulator ;
- 317 tests application passes, 6 ignores, TypeScript et seuils CI au vert ;
- couverture globale application portee a 13,60 % des lignes et 50,43 % des branches.

Les modules annonces critiques sont couverts entre 77,18 % et 100 % des lignes et disposent
maintenant de seuils CI individuels. Detail dans [LOT-8A-AUDIT.md](./LOT-8A-AUDIT.md).

#### Lot 8B - Annonces dans le navigateur

Execute le 2026-07-19 :

- 27/27 parcours Playwright passes sur les 12 variantes, en mobile et desktop ;
- champs, claviers, libelles accessibles, erreurs, images, brouillons, reset et navigation
  entre etapes verifies ;
- normalisation du telephone gabonais et valeurs `01` du studio/appartement verrouillees ;
- smoke test reel Firebase dev passe pour creation avec image, double clic, modification
  et suppression ;
- nettoyage confirme : aucun document de test restant et deux fichiers Storage supprimes ;
- 320 tests application passes, 6 ignores, TypeScript et seuils CI au vert.

Le lot a aussi reduit les synchronisations Firebase Auth concurrentes a un seul appel par
UID et corrige l'accessibilite des champs de l'etape 2. Detail dans
[LOT-8B-AUDIT.md](./LOT-8B-AUDIT.md).

#### Lot 8C - Pipeline video des reels

Execute le 2026-07-20 :

- 8/8 tests metier et FFmpeg passes : claim atomique, generation Storage, decoupe,
  limite de cinq minutes, remux, reencodage MOV, son coupe et miniature ;
- 5/5 tests de regles Storage ajoutes, soit 25/25 regles Firestore et Storage au total ;
- smoke test reel Firebase dev passe pour creation, upload MOV, transcodage, rejeu,
  modification, suppression et nettoyage ;
- le rejeu du meme chemin ne relance pas FFmpeg et sa generation brute est supprimee ;
- 83 tests Functions passes, 5 ignores, et 320 tests application passes, 6 ignores ;
- couverture Functions portee a 42,93 % des lignes ; le transcodeur atteint 49,03 % des
  lignes, 62,41 % des branches et 66,66 % des fonctions avec un seuil CI individuel.

Le lot corrige aussi une ouverture involontaire des chemins Storage proteges par le
catch-all historique, ainsi que les courses entre generations d'un meme upload. Detail
dans [LOT-8C-AUDIT.md](./LOT-8C-AUDIT.md).

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
