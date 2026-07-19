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
- Integration Firestore Emulator : 4/4.
- Contrat de configuration de l'index Firestore : 1/1.
- TypeScript : aucune erreur.
