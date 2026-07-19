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
