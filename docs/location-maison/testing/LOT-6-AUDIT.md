# Lot 6 - Publicites, monitoring et regression continue

## Lot 6A - Credits reels en Firebase dev

Date : 2026-07-19

Environnement : `location-maison-dev`, application locale sur `127.0.0.1:3001`, Firestore distant reel. Aucun mock, aucun emulateur et aucune ecriture en production.

### Scenario execute

1. Selection d'un compte annonceur dev dont l'UID correspond a l'ID du document utilisateur.
2. Verification du solde initial par l'API et directement dans Firestore.
3. Publication simultanee de deux requetes identiques pour une publicite `discovery` a 15 credits.
4. Verification d'une seule campagne, d'une seule transaction et d'une reponse `replayed: true`.
5. Publication simultanee de deux requetes identiques pour un boost d'annonce a 3 credits.
6. Verification d'un seul boost, d'une seule transaction et d'une reponse `replayed: true`.
7. Reutilisation volontaire de la cle publicitaire avec un payload different, refusee en `409` sans debit.
8. Verification du solde et des deux transactions via `/api/credits/balance` et `/api/credits/history`.
9. Suppression des documents de test et compensation exacte des credits depenses.

### Resultat

- Solde : `200 -> 185 -> 182 -> 200`.
- Publicite : 15 credits debites une seule fois.
- Boost : 3 credits debites une seule fois.
- Double soumission : aucune campagne, promotion ou transaction dupliquee.
- Payload divergent : `IDEMPOTENCY_PAYLOAD_MISMATCH`, aucun debit supplementaire.
- Nettoyage independamment controle : zero propriete, campagne, cle d'idempotence ou transaction Lot 6A restante.

### Defaut detecte et corrige

Le filtre `type=spend` de `/api/credits/history` renvoyait `500` sur Firestore dev. La requete necessitait l'index composite suivant, absent de la configuration :

```text
credit_transactions: type ASC, uid ASC, createdAt DESC
```

L'index a ete ajoute dans `apps/location-maison/firestore.indexes.json`, deploye sur `location-maison-dev`, attendu jusqu'au statut `SUCCESSFUL`, puis le scenario complet a ete rejoue avec succes.

### Commande

Demarrer l'application dev :

```bash
cd apps/location-maison
npm run dev -- --hostname 127.0.0.1 -p 3001
```

Dans un autre terminal :

```bash
LOT6A_CONFIRM_REAL_DEV=1 \
LOT6A_USER_EMAIL=<compte-annonceur-dev> \
LOT6A_BASE_URL=http://127.0.0.1:3001 \
npm run test:smoke:lot6a
```

Le test exige une confirmation explicite, controle les deux identifiants Firebase, refuse les variables d'emulateur et effectue son nettoyage dans un bloc `finally`.

### Validation associee

- Smoke test reel Lot 6A : PASS.
- Tests API publicite, promotion et credits : 20/20.
- Integration Firestore Emulator : 5/5 apres ajout du scenario Lot 6B.
- Contrat de configuration de l'index Firestore : 1/1.
- TypeScript : aucune erreur.

## Lot 6B - Diffusion publicitaire et AdSense

Date : 2026-07-19

Environnements : Jest, Firestore Emulator et application dev Playwright sur `127.0.0.1:3001`. Le controle de production est strictement en lecture et ne clique aucune publicite.

### Regles testees

1. Seuls les emplacements publicitaires declares sont acceptes.
2. Une campagne doit etre active, dans sa fenetre de dates et compatible avec le ciblage geographique.
3. Le visuel specifique a l'emplacement est prefere au visuel par defaut.
4. La rotation unitaire n'est pas mise en cache ; le slider de l'accueil conserve un cache court.
5. Une impression ou un clic n'ecrase pas l'autre compteur.
6. Un identifiant inconnu renvoie `404` et ne cree aucun document `ad_campaigns` incomplet.
7. Une pub maison et un slot AdSense restent deux inventaires independants.
8. Dans les reels, l'impression maison est envoyee seulement quand la diapositive devient active et une seule fois.
9. Un slot AdSense `unfilled` affiche le CTA `Votre bien peut etre vu ici` au lieu d'un carre vide.
10. Les slides publicitaires gardent la surface verticale d'un reel normal.

### Defauts detectes et corriges

- Le suivi publicitaire utilisait `set(..., merge: true)`. Un appel public avec un identifiant arbitraire pouvait donc creer une campagne fantome. L'increment utilise maintenant `update` avec un increment atomique : un document absent est refuse sans lecture Firestore supplementaire et l'API renvoie un resultat explicite.
- La requete `status == active` + `placements array-contains` n'avait pas d'index composite versionne. L'index `ad_campaigns(status ASC, placements ARRAY_CONTAINS)` a ete ajoute puis deploye sur dev et production sans `--force`.

### Resultats automatises

- API et composants : 11/11.
- Firestore Emulator cible publicite : 1/1.
- Regression complete Firestore Emulator : 5/5.
- Playwright feed reels : 1/1 en 6,1 s.
- Couverture ciblee routes et composants 6B : 92,44 % lignes, 73,07 % branches, 100 % fonctions.
- TypeScript : aucune erreur.

### Smoke production en lecture seule

Execute apres passage des index dev et production a `READY` / `SUCCESSFUL` :

- `search_infeed` : `200`, campagne active retournee, cache `private, no-store`.
- `property_detail` : `200`, campagne active retournee, cache `private, no-store`.
- `immobilier_infeed` : `200`, campagne SONGO active retournee.
- `home&all=1` : `200`, trois campagnes retournees, dont SONGO.
- `reels_infeed` : `200`, aucune campagne maison active (`creative: null`) ; le composant utilise donc AdSense puis son repli si Google ne remplit pas le slot.
- `/reels` : `200`, HTML rendu et script `adsbygoogle.js` present.

Aucun appel `POST`, clic publicitaire, vue de reel ou impression publicitaire n'a ete declenche pendant ce smoke test.

### Commandes

```bash
cd apps/location-maison
npm test -- --runInBand --coverage=false \
  __tests__/api/advertising-serving.test.ts \
  __tests__/components/advertising-serving.test.tsx
npm run test:emulator:ads
npm run test:e2e:lot6b
```

Le test Playwright bloque les domaines publicitaires Google et simule le statut `unfilled`. Il ne genere donc ni impression ni clic AdSense reel. Le remplissage d'une annonce Google ne peut pas etre exige par un test automatise ; le lot verifie le slot, le statut et le repli non vide.

## Lot 6C - Statistiques fiables et couts Firebase

Date : 2026-07-19

Environnements : Jest, Firestore Emulator et application dev Playwright. Aucune ecriture
sur Firebase dev distant ou production et aucun clic publicitaire reel.

### Garanties implementees

1. Le navigateur conserve un identifiant aleatoire propre aux statistiques dans localStorage.
2. Le serveur ne conserve jamais cet identifiant ni l'adresse IP en clair : il utilise
   une empreinte SHA-256 tronquee.
3. Une vue de reel du meme visiteur est comptee au maximum une fois toutes les 6 heures.
4. Une impression publicitaire du meme visiteur, de la meme campagne et de la meme
   surface est comptee au maximum une fois toutes les 30 minutes.
5. Un clic publicitaire repete est bloque pendant 5 secondes et un partage identique
   pendant 10 secondes.
6. Repeter le meme etat de like ne modifie pas le compteur. Like puis unlike sont
   appliques dans l'ordre, y compris lors de deux appuis rapides.
7. Les compteurs ne descendent jamais sous zero.
8. Les increments de vues et partages utilisent directement update + increment,
   sans lecture prealable du reel.
9. Redis reserve les evenements avec SET NX EX. Le repli Firestore utilise une
   transaction atomique et peut demarrer sans charger le client Redis.
10. Le tableau publicitaire affiche impressions, clics et taux de clic global/par campagne.

### Scenarios emulateur

- Deux vues concurrentes avec le meme visiteur : deux reponses 200, une seule
  hausse du compteur et une reponse deduplicated: true.
- Like, meme like, unlike : une hausse, aucun doublon, puis retour au compteur initial.
- Deux partages WhatsApp rapproches : une seule hausse globale et par cible.
- Deux impressions identiques : une seule hausse ; le clic reste une metrique independante.
- Campagne et reel absents : 404, aucun document metier fantome.
- Regression complete credits, promotion, campagne, diffusion et cycle de vie reel : 6/6.

### Defaut detecte et corrige

CACHE_BACKEND=firestore chargeait tout de meme le module Redis au demarrage. Sans
variables Upstash, le repli plantait avant sa premiere operation. Le client Redis est
maintenant charge paresseusement uniquement lorsqu'une methode Redis est appelee.

La couverture complete a egalement revele un mock Framer Motion d'inscription incomplet.
useReducedMotion a ete ajoute au mock et les trois tests d'inscription repassent.

### Resultats

- Tests API, navigateur, cache et tableaux de bord : 34/34.
- Suite Jest complete : 200 passes, 6 skips explicites, 0 echec.
- Firestore Emulator cible statistiques : 2/2.
- Regression Firestore Emulator : 6/6.
- Playwright diffusion reels/publicites : 1/1.
- Tests d'inscription retablis : 3/3.
- Couverture ciblee : 86,02 % lignes, 67,45 % branches, 86,11 % fonctions.
- TypeScript et git diff --check : aucune erreur.

La deduplication navigateur evite la majorite des appels lors d'une actualisation. La
deduplication serveur protege aussi contre les doubles requetes et onglets concurrents.
En production, Redis reste le backend nominal ; le repli Firestore economise l'ecriture
du compteur mais consomme encore une lecture transactionnelle de cache.

### Commandes

~~~bash
cd apps/location-maison
npm run test:emulator:stats
npm run test:emulator:api
npm run test:e2e:lot6b
npx tsc --noEmit
~~~

## Lot 6D - Observabilite, CI et smoke reel dev

Date : 2026-07-19

### Garanties ajoutees

1. Les creations, modifications et suppressions de reels, achats de credits et statistiques reels/publicites portent un `requestId` stable dans les logs et la reponse HTTP.
2. Le logger Next.js masque les emails, telephones, secrets, tokens, signatures, hash et corps bruts; il tronque aussi les valeurs et profondeurs excessives.
3. Les callbacks MyPayGa ne journalisent plus la query, le body, le raw body ni les prefixes de signature.
4. Le transcodage reel et les callbacks de paiement exposent des categories et codes d'incident filtrables dans Cloud Logging.
5. `/api/health` controle la presence de la configuration critique sans appel facture a Firebase ou Redis.
6. La CI GitHub execute TypeScript, Jest avec couverture, les regles Firestore, l'integration emulateur et les tests/compilation Functions.
7. Un monitoring programme controle la sante et le rendu public toutes les 30 minutes, avec ticket GitHub automatique.

### Defaut reel detecte et corrige

Le smoke test a detecte que la base Upstash dev est temporairement limitee par le fournisseur. L'auto-pipeline du SDK transformait ce diagnostic en `res.map is not a function`, puis `RedisCacheStore` convertissait l'erreur en `false`. Les statistiques interpretaient donc la panne comme un doublon et n'incrementaient rien.

L'auto-pipeline est desactive pour conserver l'erreur originale. Redis bascule maintenant automatiquement vers Firestore et ouvre un circuit de 60 secondes. Le smoke reel a ensuite valide le chemin complet avec Redis configure et `firestore-fallback` effectif.

### Resultats

- Smoke Firebase dev reel : PASS, compteurs `views=1`, `likes=0`, `shares=1`, trois doublons detectes.
- Nettoyage distant : zero reel technique et zero entree cache Lot 6D restante.
- Application : 207 tests passes, 6 skips explicites, 0 echec.
- Cloud Functions : 42 tests passes, 5 skips explicites, 0 echec; compilation TypeScript PASS.
- Regles Firestore : PASS.
- Integration Firestore Emulator : 6/6.
- TypeScript application et validation YAML : PASS.
- Couverture globale application : 9,05 % lignes, 42,64 % branches, 20,51 % fonctions.
- Couverture globale Functions : 16,38 % lignes, 17,09 % branches, 19,29 % fonctions.

La couverture globale n'est donc pas encore proche de 70-80 %. Les pourcentages cibles eleves du Lot 6C concernent uniquement les modules critiques selectionnes. La CI publie maintenant les deux rapports globaux et empeche une baisse sous la baseline actuelle.

Le detail des alertes, recherches de logs et actions d'incident se trouve dans [LOT-6D-RUNBOOK.md](./LOT-6D-RUNBOOK.md).

## Lot 6E - Deploiement et validation production

Date : 2026-07-19

### Deploiements effectues

- Application Next.js deployee sur Vercel et promue sur `www.tonnkama.com`.
- `transcodeReelVideo`, `mypaygaPaymentCallback` et `giftPaymentCallback` deployees sur Firebase dev.
- Les trois memes fonctions deployees sur Firebase production.
- Runtime Node.js 22 et etat `ACTIVE` confirmes dans les deux projets Firebase.
- Backend de cache Vercel production force a `firestore`; Redis reste hors service tant que sa facturation n'est pas regularisee.

### Validation post-deploiement

- Deploiement Vercel final `dpl_HHTwy2YufTSwG8gzZNS9HXDQY9x2` : `Ready`, promu sur `www.tonnkama.com` avec la configuration Firestore.
- `GET https://www.tonnkama.com/api/health` : HTTP 200 et `status=ok`.
- `GET https://www.tonnkama.com/reels` : HTTP 200.
- `/`, `/property`, `/gifts` et `/advertising` : HTTP 200.
- Firebase dev : 3 fonctions deployees, 0 erreur.
- Firebase production : 3 fonctions deployees, 0 erreur.
- Les journaux de demarrage production montrent une sonde TCP reussie pour les trois nouvelles revisions.
- Aucun callback de paiement et aucun transcodage metier n'ont ete declenches pendant cette verification.

### Monitoring

Le workflow `.github/workflows/location-maison-monitoring.yml` est pret et son smoke test equivalent a ete execute manuellement avec succes. Il n'est pas encore programme sur GitHub, car les changements du lot ne sont pas encore publies dans le depot distant. Son activation devra etre verifiee apres commit/push avec une execution `workflow_dispatch`.
