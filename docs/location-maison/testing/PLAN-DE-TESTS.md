# Plan de tests - Trouve Ton Nkama

Derniere mise a jour : 2026-07-22

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

#### Lot 8D - Parcours navigateur des reels

Execute le 2026-07-20 :

- 6/6 scenarios Playwright passes, avec recuperation reseau en mobile/desktop et parcours
  annonceur sur une vraie session Firebase ;
- vraie video verticale H.264/AAC chargee dans l'editeur mobile, sans publication Storage ;
- lecture des statuts et statistiques, modification et suppression confirmees directement
  dans Firestore Dev ;
- utilisateur et reels temporaires nettoyes automatiquement apres le run ;
- 48/48 tests metier reels cibles et 9/9 regressions mobiles Lot 4 passes ;
- suite CI et TypeScript au vert ; couverture globale a 13,73 % des lignes, 30,50 % des
  fonctions et 50,73 % des branches.

Le lot a ferme une faille de generation de custom token Firebase par UID arbitraire, attend
desormais Firebase Auth avant de charger `Mes reels`, ajoute la recuperation d'erreur du feed
et corrige les cibles tactiles des editeurs. Detail dans
[LOT-8D-AUDIT.md](./LOT-8D-AUDIT.md).

#### Lot 8E - Recherche, consultation et couts du catalogue

Execute le 2026-07-20 :

- 30/30 tests metier, API et base de donnees cibles passes sur les filtres, la pagination,
  la carte et les statistiques d'annonces ;
- 4/4 parcours Playwright passes en mobile et desktop, dont une vraie annonce Firebase Dev ;
- filtres Algolia numeriques valides et echappes, sans injection ni valeur `Infinity` ;
- navigation mobile sans rechargement et etats chargement/erreur/aucun resultat distincts ;
- vues dedupliquees six heures et interactions rapides dedupliquees dix secondes cote client
  et serveur, avec identifiant visiteur opaque ;
- pagination catalogue serialisable, limites de 1 a 50, fin de liste explicite et carte
  plafonnee a 200 annonces par requete ;
- suite CI a 353 tests passes et 6 ignores ; couverture globale portee a 14,45 % des lignes,
  31,66 % des fonctions et 50,76 % des branches.

Detail dans [LOT-8E-AUDIT.md](./LOT-8E-AUDIT.md).

### Lot 9 - Couverture globale a 50 %

Ce lot commencera apres la fin de tous les sous-lots 8. Son objectif est d'atteindre au
minimum 50 % sur chacune des quatre metriques globales de l'application : lignes,
instructions, fonctions et branches, sans exclure artificiellement du rapport les fichiers
difficiles a tester.

Point de depart mesure apres le Lot 8E :

| Metrique | Couverture actuelle | Cible Lot 9 |
| --- | ---: | ---: |
| Lignes | 14,45 % | 50 % minimum |
| Instructions | 14,45 % | 50 % minimum |
| Fonctions | 31,66 % | 50 % minimum |
| Branches | 50,76 % | 50 % minimum, sans regression |

Avec le denominateur actuel de 90 675 lignes, la cible represente environ 45 338 lignes
couvertes contre 13 111 aujourd'hui. Il reste donc environ 32 227 lignes a exercer si la
taille du code reste stable. L'effort sera decoupe pour rendre chaque progression verifiable :

- 9A : termine le 2026-07-20, inventaire des fichiers non couverts a fort volume et
  montee de la couverture lignes a 21,90 % avec un seuil CI fixe a 20 % ;
- 9B : termine le 2026-07-21, composants, hooks, formulaires complexes et emails ;
  couverture globale portee a 31,02 % et seuil CI fixe a 30 % ;
- 9C : termine le 2026-07-22, recherche IA, profil, authentification, localisation,
  credits et recherche ; couverture lignes portee a 40,16 % et seuil CI fixe a 40 % ;
- 9D : termine le 2026-07-22, cas d'erreur, branches restantes, tests de regression
  et seuil CI final fixe a 50 %.

#### Lot 9A - Inventaire et premier palier

Execute le 2026-07-20 :

- 13 pages editoriales testees sur leur rendu, metadonnees SEO, structure semantique,
  liens internes et appels a action ;
- parseur OSM teste sur les entrees invalides, la normalisation, les associations,
  la serialisation et le cache ;
- doublons OSM proches d'un meme quartier fusionnes, tout en conservant les homonymes
  eloignes de plus d'un kilometre ;
- 22/22 nouveaux tests cibles et 375 tests application passes, avec 6 ignores ;
- couverture globale portee de 14,45 % a 21,90 % des lignes et instructions, de
  31,66 % a 34,19 % des fonctions et de 50,76 % a 51,34 % des branches ;
- seuils CI releves a 20 % lignes/instructions, 30 % fonctions et 50 % branches.

Les prochains volumes prioritaires sont la recherche IA, le wizard publicitaire, la
gestion des annonces, le feed reels, les listes d'annonces, les statistiques et les
formulaires de profil. Detail dans [LOT-9A-AUDIT.md](./LOT-9A-AUDIT.md).

#### Lot 9B - Composants majeurs et palier 30 %

Execute le 2026-07-21 :

- parcours complet du wizard publicitaire, validation du lien, upload, paiement,
  idempotence du bouton et insuffisance de credits ;
- gestion des campagnes et hook associe : filtres, pagination, archivage, activation,
  suppression, erreurs et etats vides ;
- feed reels et espace annonceur : lecture, navigation, likes, partages, cadeaux,
  statistiques, pagination et suppression ;
- catalogue annonceur : requete Firestore, pagination, archivage, cache React Query,
  images et informations propres aux dix types de biens ;
- tableau de statistiques : compteurs, courbe, periodes, geographie, interactions et
  timestamps Firestore ;
- rendu HTML des emails de bienvenue, verification, mot de passe, publication et du
  layout commun, y compris leurs variantes facultatives ;
- 49 nouveaux tests, 443 tests application passes et 6 ignores ;
- couverture globale portee a 31,02 % des lignes/instructions, 43,49 % des fonctions
  et 58,51 % des branches ;
- seuils CI releves a 30 % lignes/instructions, 40 % fonctions et 55 % branches.

Le detail des fichiers et validations est dans [LOT-9B-AUDIT.md](./LOT-9B-AUDIT.md).
La route de recherche IA, les surfaces profil et les parcours de recherche restaient
les principaux volumes a couvrir au palier suivant.

#### Lot 9C - Recherche, profil et palier 40 %

Execute le 2026-07-22 :

- recherche IA testee de la route serveur jusqu'au hook client et au formulaire Gemini ;
- profil, connexion, reinitialisation et verification OTP couverts sur leurs etats limites ;
- localisation testee du cache navigateur a Photon, Nominatim, Overpass et Firebase ;
- recherche desktop/mobile, filtres URL, publicites et pagination infinie verifies ;
- historique, achat de credits et promotions couverts avec les retours MyPayGa ;
- deux regressions d'interaction corrigees sur l'effacement d'une localite et le badge de pagination ;
- 577 tests passes et 6 ignores ; couverture globale a 40,16 % des lignes/instructions,
  50,81 % des fonctions et 65,76 % des branches ;
- seuils CI releves a 40 % lignes/instructions, 50 % fonctions et 60 % branches.

Detail dans [LOT-9C-AUDIT.md](./LOT-9C-AUDIT.md). Le Lot 9D portera les lignes et
instructions au palier final de 50 %.

#### Lot 9D - Cas limites et palier final 50 %

Execute le 2026-07-22 :

- formulaires immobiliers, publication, assistants IA et recherche IA couverts sur leurs
  interactions, validations et echecs ;
- inscription, reinitialisation, authentification, profil et activites de compte verifies ;
- cadeaux, publicite, analytics, SEO, OSM serveur et bases de campagnes testes ;
- footer couvert sur ses contacts, publicites, PWA et regles de visibilite mobile ;
- 810 tests passes et 6 ignores ; couverture globale a 50,04 % des lignes/instructions,
  59,43 % des fonctions et 70,56 % des branches ;
- seuils CI finaux fixes a 50 % lignes/instructions, 50 % fonctions et 60 % branches.

Detail dans [LOT-9D-AUDIT.md](./LOT-9D-AUDIT.md). L'objectif de couverture du Lot 9
est atteint et protege contre les regressions par la CI.

Les tests Playwright prouvent les parcours utilisateurs mais ne font pas progresser le rapport
Jest actuel. Le Lot 9 ajoutera donc principalement des tests unitaires, composants et API
instrumentes, tout en conservant les E2E comme filet de securite fonctionnel. A chaque palier,
la CI sera relevee pour interdire de redescendre sous le niveau obtenu.

### Lot 10 - Couverture globale a 60 %

Ce lot commence apres la fin du Lot 9. Son objectif est de porter les lignes et instructions
de l'application de 50 % a 60 %, sans regression des fonctions (deja 59,43 %) ni des branches
(deja 70,56 %), et sans exclure de fichiers du rapport.

Point de depart mesure a la fin du Lot 9D (rapport
`__tests__/coverage/coverage-summary.json`) :

| Metrique | Couverture actuelle | Cible Lot 10 |
| --- | ---: | ---: |
| Lignes | 50,04 % (45 193 / 90 306) | 60 % minimum |
| Instructions | 50,04 % (45 193 / 90 306) | 60 % minimum |
| Fonctions | 59,43 % (1 065 / 1 792) | 55 % minimum, sans regression |
| Branches | 70,56 % (5 718 / 8 103) | 65 % minimum, sans regression |

Avec le denominateur actuel de 90 306 lignes, la cible de 60 % represente environ 54 184 lignes
couvertes contre 45 193 aujourd'hui. Il reste donc environ **9 000 lignes** a exercer si la taille
du code reste stable.

Inventaire des lignes non couvertes par domaine (source : rapport 9D), du plus gros levier au
plus petit :

| Domaine | Lignes non couvertes | Nature |
| --- | ---: | --- |
| `src/app/api/**` | 4 789 (68 fichiers) | Routes serveur, logique mockable, meilleur ratio effort/gain |
| `src/components/home-page/**` | 2 647 (18 fichiers) | PropertyCard, HomePage, FilterModal, Navbar (0 %) |
| `src/components/preview-property/**` | 1 823 (18 fichiers) | Carousel et fiche detail |
| `src/components/reels/**` | 1 367 (10 fichiers) | VideoTrimEditor, CreateReelClient, GiftModal |
| `src/features/auth/**` | 1 320 (23 fichiers) | Signup/Signin restants |
| `src/components/search/**` | 1 310 (15 fichiers) | SearchDesktopPage, filtres |
| `src/db/property-statistics.db.ts` | 335 (a 38 %) | Fichier unique a fort gain |

L'effort est decoupe en deux paliers verifiables, chacun relevant la CI pour interdire une
regression.

#### Principe anti-faux-vrai

Un test qui mocke la fonction qu'il pretend tester passe toujours et ne prouve rien. Pour eviter
que la montee de couverture produise de faux positifs, chaque test ajoute au Lot 10 respecte ces
regles, verifiees lors de l'audit du Lot 9 sur la suite existante :

- ne jamais mocker le module sous test ; ne mocker que les frontieres d'infrastructure (SDK
  Firebase, `next/server`, router, animations, feuilles du design-system) ;
- privilegier les assertions de valeur (sortie reelle, DOM rendu, code HTTP, effet metier) plutot
  que le simple `toHaveBeenCalled`, qui reste reserve aux invariants (idempotence, non-ecriture) ;
- pour toute route ou regle metier critique, doubler le test a SDK mocke d'au moins un test sur
  emulateur Firestore reel, afin de valider ce que le faux SDK ne voit pas : regles de securite,
  index composites, semantique des operateurs, `Timestamp`, transactions.

La couverture v8 ne comptant que les lignes reellement executees, un module mocke ne compte pas :
le chiffre de couverture mesure donc du vrai code exerce, pas des mocks.

#### Lot 10A - Routes API et palier 55 %

But : exploiter le plus gros levier, les routes serveur, qui sont de la logique mockable sans
navigateur.

Perimetre :

- statistiques serveur : `src/app/api/analytics/presence/route.ts` (236 lignes non couvertes)
  et les routes analytics associees ;
- assistant IA : `src/app/api/ai/assistant/chat/route.ts` (225) et la recherche IA restante ;
- localisation serveur : `src/app/api/location/search/route.ts` (230) ;
- reels : finir `src/app/api/reels/route.ts` (244 lignes restantes, deja a 63 %) ;
- le reste des 68 routes `src/app/api/**` (succes, erreurs metier, pannes reseau, autorisation,
  validations, deduplication) ;
- complement sur `src/db/property-statistics.db.ts` pour absorber ses 335 lignes non couvertes.

Garde-fou d'authenticite (voir Principe anti-faux-vrai) : pour chaque route critique couverte
ici (idempotence, credits, paiements, publication), ajouter au moins un test sur emulateur
Firestore reel via `test:emulator:api`, en plus du test rapide a SDK mocke. Le test a mocks
valide la logique, le test emulateur valide les regles, index et transactions reels.

Cible : couvrir environ 70 % du domaine API (~3 350 lignes) plus la base statistiques (~300),
soit environ +3 650 lignes couvertes, portant les lignes/instructions a environ 55 %.

Execute le 2026-07-23 :

- une trentaine de routes `src/app/api/**` couvertes (forwarders analytics, assistant IA,
  localisation serveur, authentification par email, paiements/cadeaux, annonces/reels,
  divers) et `src/db/property-statistics.db.ts` porte de 38,3 % a 88,02 % de lignes ;
- deux quirks de schema latents decouverts et figes par des tests (`limit` absent traite
  comme `null` plutot que `undefined` sur `location/search` et `location/suggestions`),
  sans impact production connu (seuls appelants envoient toujours `limit`) ;
- un blocage externe corrige en cours de lot : trois suites cassees par un chantier
  concurrent sur l'authentification telephone (`slow-buffer-compat.ts` incompatible ts-jest,
  hook non mocke, mocks obsoletes face a deux evolutions reelles du code) ; detail et preuve
  par injection de bug dans `LOT-10A-AUDIT.md` ;
- 1 047 tests passes et 6 ignores ; couverture globale a 55,06 % des lignes/instructions,
  63,20 % des fonctions et 72,49 % des branches ; `check:types` et `test:ci` verts.

Sortie attendue : seuils CI releves a 55 % lignes/instructions, fonctions et branches
inchanges. Audit dans `LOT-10A-AUDIT.md`. Reporte au Lot 10B : les tests sur emulateur
Firestore reel du Principe anti-faux-vrai pour les routes critiques (credits, idempotence).

#### Lot 10B - Clusters UI et palier final 60 %

But : couvrir les grands ensembles de composants encore a 0 %, sur le modele rode aux Lots 9B
et 9C (rendu, etats de chargement et d'erreur, interactions, branches conditionnelles).

Perimetre :

- page d'accueil : `PropertyCard`, `HomePage`, `HomePageMobileComponent`,
  `HomePageDesktopComponent`, `FilterModal`, `FilterModalHomePage`, `Navbar`,
  `use-filter-modal` (~2 647 lignes) ;
- fiche detail : `CarouselPropertyDetails`, `PreviewPropertyMobile` et le reste de
  `src/components/preview-property/**` (~1 823 lignes) ;
- recherche : `SearchDesktopPage`, `FilterSearchDesktopPageSection` et les filtres
  `src/components/search/**` (~1 310 lignes).

Cible : couvrir environ 85 % de ces clusters (~4 900 lignes), portant les lignes/instructions
a 60 % ou plus.

Execute le 2026-07-23 :

- home-page, preview-property et search couverts sur leurs composants principaux (voir liste
  complete dans `LOT-10B-AUDIT.md`) ; `HomePage.tsx` et `ModaleLanguageSwitcher.tsx` exclus
  car code mort (aucun import ailleurs dans `src/`) ; `CarouselPropertyType.tsx` bloque par un
  defaut d'environnement preexistant (`identity-obj-proxy` reference dans `jest.config.ts`
  mais absent de `node_modules`, necessiterait un `npm install` depuis la racine du monorepo) ;
- deux constats de code reel documentes sans correction (hors scope) : sur mobile, `Navbar.tsx`
  rend les CTA annonceur du bloc visiteur inatteignables pour un utilisateur connecte ; le
  repli `nbrKitchens ?? nbrChickens` dans `DetailsProperty`/`DetailsPropertyMobile` est une
  typo historique conservee pour compatibilite ;
- 1 219 tests passes et 6 ignores ; couverture globale a 60,16 % des lignes/instructions,
  66,15 % des fonctions et 73,29 % des branches ; `check:types` et `test:ci` verts.

Sortie attendue : seuils CI finaux fixes a 60 % lignes/instructions, 55 % fonctions et 65 %
branches. Audit dans `LOT-10B-AUDIT.md`. L'objectif de couverture du Lot 10 est alors atteint
et protege contre les regressions par la CI.

Reporte a une prochaine iteration : tests sur emulateur Firestore reel pour les routes
critiques (deja reporte au Lot 10A), resolution du defaut `identity-obj-proxy`, et la passe de
mutation testing prevue ci-dessous.

#### Preuve systematique par mutation testing

En cloture du Lot 10, lancer une passe de mutation testing (Stryker) sur les modules critiques
(`src/db/**`, paiements, idempotence, credits). La couverture prouve que le code s'execute ;
le score de mutation prouve que les assertions attraperaient un vrai bug. Stryker injecte des
centaines de mutations dans le code source et mesure combien de tests virent au rouge : un
mutant survivant designe une ligne couverte mais mal assertee, c'est-a-dire un faux vrai a
corriger. Objectif : score de mutation eleve sur les modules critiques, documente a cote du
score de couverture. Cette passe est ponctuelle (hors CI standard car couteuse en temps), a
relancer apres chaque gros ajout de tests metier.

But : reduire et verrouiller le cout des requetes Firestore (lectures/ecritures/suppressions
facturables), dans la continuite du Lot 2 (idempotence, listeners) et du Lot 6C (maitrise des
ecritures). Ce lot vise les memes signaux que le tableau de bord Query Insights sans changer
d'edition Firestore.

Contexte edition. Query Insights de la
[documentation Firestore Enterprise](https://firebase.google.com/docs/firestore/enterprise/query-insights?hl=fr)
n'est disponible que sur l'edition Enterprise (mode natif, API `find()`/`aggregate()`). Les
bases `location-maison-dev/preprod/prod` sont sur l'edition Standard : la migration vers
Enterprise est un changement de facturation quasi irreversible, non justifie pour cette
plateforme. On reproduit donc les memes signaux (lectures facturables, documents scannes,
entrees d'index scannees, latence) avec des outils gratuits sur l'edition Standard.

Etat initial du code (audit statique du 2026-07-22) :

- comptages via agregation `getCountFromServer` deja utilises (property, statistic,
  credit-transaction) : evite de lire tous les documents pour compter ;
- pagination `limit()` presente dans 21 fichiers ;
- cache React Query present dans 42 fichiers ;
- 6 listeners `onSnapshot` a auditer (portee, `limit`, `unsubscribe`, refresh) ;
- 22 index composites a auditer (index inutilises = ecritures facturees en plus).

Le code est deja plutot sobre : ce lot est un audit-et-resserrage cible, pas une refonte.

#### Lot 11A - Observabilite gratuite

But : voir ou part l'argent sans Enterprise.

- Tableau de bord Cloud Monitoring sur `firestore.googleapis.com/document/read_count`,
  `write_count` et `delete_count`, ventile par base et par periode.
- Croisement avec l'onglet Usage & facturation Firebase pour classer les collections et
  parcours les plus couteux.
- Alertes de budget sur les seuils de lectures/ecritures journalieres par environnement.

Sortie attendue : un classement des zones couteuses reelles, base des priorites du Lot 11B.

#### Lot 11B - Audit statique des requetes et des index

But : corriger les motifs couteux dans le code.

- Les 6 `onSnapshot` : verifier portee limitee, `limit`, desabonnement au demontage, absence
  de refresh abusif ; remplacer par une lecture ponctuelle quand le temps reel n'apporte rien.
- Les 18 fichiers `getDocs` : reperer les N+1, l'absence de `limit`, les re-lectures que le
  cache React Query devrait absorber, et les comptages qui devraient passer par agregation.
- Les 22 index composites : identifier les index inutilises (chaque index ajoute un cout
  d'ecriture) et les requetes sans index qui forcent un scan large.

Sortie attendue : liste priorisee des corrections par impact FCFA estime, appliquees ou notees
en dette.

#### Lot 11C - Tests de regression de cout

But : empecher une derive de cout de revenir apres correction.

- Dans les tests emulator et a mocks, instrumenter `getDocs`/`getDoc`/`onSnapshot` par des
  espions qui comptent les lectures d'un parcours.
- Definir un budget de lectures par parcours critique (accueil, recherche, fiche annonce,
  feed reels, statistiques) et faire echouer le test au-dela du budget.
- Brancher ces assertions sur les suites existantes des Lots 2 et 6C plutot que d'en creer une
  famille separee.

Sortie attendue : garde-fou durable en CI contre les requetes qui relisent trop, documente au
meme titre que les seuils de couverture.

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
| Requetes Firestore trop couteuses | Facture Firebase qui derive | Lot 2 puis Lot 11 |

## Definition of Done qualite

Une fonctionnalite est consideree prete quand :

- Les regles metier associees ont au moins un test automatise.
- Les erreurs attendues sont gerees avec un message clair.
- Les actions de creation/paiement sont idempotentes ou protegees contre le double clic.
- Le parcours mobile a ete verifie visuellement.
- Les couts Firebase sont limites par pagination, cache ou debouncing quand necessaire.
- La couverture ne descend pas sous la baseline acceptee, ou la baisse est justifiee dans la PR.
- Les regressions connues sont documentees si elles ne sont pas corrigees dans le lot.
