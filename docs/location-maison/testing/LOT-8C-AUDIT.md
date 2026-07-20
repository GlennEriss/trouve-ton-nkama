# Lot 8C - Pipeline video des reels

Date d'execution : 2026-07-20.

## Objectif

Verifier le pipeline video des reels hors UI, depuis les regles d'upload jusqu'au
nettoyage final, avec de vrais binaires FFmpeg puis un parcours complet sur Firebase dev
sans mocks et sans laisser de donnees de test.

## Perimetre automatise

- validation du chemin `reels-raw/{ownerId}/{reelId}.{ext}` ;
- correspondance proprietaire, document Firestore et chemin Storage ;
- claim atomique d'une seule tentative de traitement ;
- distinction des generations quand le meme chemin est uploade plusieurs fois ;
- calcul defensif de la decoupe, son coupe et limite de cinq minutes ;
- remux H.264/AAC compatible et reencodage MOV MPEG4/PCM vers H.264/AAC ;
- generation d'une vraie miniature JPEG ;
- droits Storage des fichiers bruts, reels traites, publicites et chemins historiques ;
- creation, upload, transcodage, rejeu, modification et suppression sur Firebase dev ;
- verification du codec, de la piste audio, de la duree, du cache et des URLs publiques ;
- nettoyage garanti du document, du brut, de la video et de la miniature.

## Defauts corriges

1. Le trigger Storage pouvait traiter un fichier dont le proprietaire ou le chemin ne
   correspondait pas au document du reel.
2. Deux evenements concurrents pouvaient lancer deux traitements FFmpeg pour le meme reel.
3. Un rejeu au meme chemin n'etait pas distingue par sa generation GCS. Le premier worker
   pouvait supprimer un upload plus recent, ou laisser le brut du rejeu facture.
4. Les echecs de suppression du brut etaient ignores sans journal exploitable.
5. Une decoupe vide pouvait atteindre FFmpeg au lieu d'etre refusee proprement.
6. Les blocs `match` Storage sont additifs : le catch-all public historique rendait les
   restrictions de `reels-raw`, `reels` et des publicites inoperantes.
7. Un upload brut sans document Firestore restait stocke. La Function retire maintenant
   cette generation orpheline.
8. Une video dont le traitement FFmpeg echouait conservait aussi son fichier brut malgre
   l'absence de retry automatique. Cette generation est maintenant nettoyee apres l'erreur.

## Resultats

| Verification | Resultat |
| --- | --- |
| Tests metier et FFmpeg reels | 8/8 PASS |
| Regles Storage reels/publicites | 5/5 PASS |
| Regles Firestore + Storage | 25/25 PASS |
| Smoke reel Firebase dev | PASS |
| Tentatives apres rejeu | 1 seule |
| Nettoyage du dernier smoke | 0 document, aucun media restant |
| Tests Cloud Functions | 83 PASS, 5 ignores |
| Tests application | 320 PASS, 6 ignores |
| TypeScript application et Functions | PASS |
| Seuils de couverture CI | PASS |

## Deploiement

- dev : regles Storage publiees, revision `transcodereelvideo-00009-jel` `ACTIVE`,
  Node.js 22, 2 CPU et 2 GiB en `europe-west1` ;
- production : regles Storage publiees, revision `transcodereelvideo-00007-feh`
  `ACTIVE`, Node.js 22, 2 CPU et 2 GiB en `us-east1`.

La couverture globale des Functions atteint 42,93 % des lignes, 42,93 % des branches et
40,80 % des fonctions. Le fichier `src/reels/transcode.ts` atteint 49,03 % des lignes,
62,41 % des branches et 66,66 % des fonctions. Un seuil CI individuel interdit desormais
de descendre sous 45 % des lignes, 58 % des branches et 55 % des fonctions.

## Smoke test reel

Le runner refuse de s'executer sans `LOT8C_CONFIRM_REAL_DEV=1`, sur un projet autre que
`location-maison-dev`, contre des emulateurs, ou avec une URL d'application non locale.
Il exige un compte annonceur dont l'UID correspond a l'identifiant du document utilisateur.

La fixture est une vraie video verticale MOV de trois secondes en MPEG4 avec audio PCM.
Le test demande une decoupe de deux secondes et un rendu muet, attend le statut `ready`,
telecharge le resultat public et le sonde avec FFprobe. Il reuploade ensuite le meme chemin
pour prouver que FFmpeg ne repart pas et que la nouvelle generation brute est retiree.
Le bloc `finally` supprime les artefacts meme si une assertion echoue.

## Commandes

```bash
cd apps/location-maison/functions
npm run build
npm run test:ci

cd ..
npm run test:rules
npm run check:types
npm run test:ci

LOT8C_CONFIRM_REAL_DEV=1 \
LOT8C_USER_EMAIL=<compte-annonceur-dev> \
LOT8C_BASE_URL=http://localhost:3001 \
npm run test:smoke:lot8c
```

## Risque residuel

Le smoke couvre une video courte et verticale. Une video reelle de cinq minutes, les
fichiers corrompus, les tres hautes resolutions et une interruption au milieu d'un upload
restent a exercer dans un lot de robustesse et de couts. La moderation humaine et
l'ergonomie mobile du formulaire reels relevent des lots UI suivants.
