# Lot 6D - Runbook observabilite et incidents

Date : 2026-07-19

## Signaux disponibles

- Les routes critiques renvoient `x-request-id` et le recopient dans leurs logs JSON.
- Les logs applicatifs portent `scope`, `operation`, `incidentCategory`, `incidentCode` et `retryable`.
- Les callbacks MyPayGa et le transcodage reels utilisent les memes dimensions dans Cloud Logging.
- Les emails, telephones, jetons, signatures, hash, corps bruts et secrets sont masques par le logger Next.js.
- `/api/health` verifie la configuration sans interroger Firebase ni Redis et ne renvoie aucun nom de secret.
- Le workflow `location-maison monitoring` est configure pour controler `/api/health` et `/reels` toutes les 30 minutes. Il devient actif apres publication du fichier sur GitHub, ouvre un ticket en cas d'echec et le ferme au retablissement.

## Alertes recommandees

| Signal | Seuil initial | Severite | Premiere action |
| --- | ---: | --- | --- |
| `CALLBACK_SECRET_MISSING` | 1 evenement | critique | Verifier les secrets MyPayGa de la Function concernee. |
| `AMOUNT_MISMATCH` | 1 evenement | critique | Suspendre la transaction et comparer montant initie/callback. |
| `INVALID_CALLBACK_SIGNATURE` | 5 en 10 min | haute | Chercher une source commune et verifier le secret sans le journaliser. |
| `REEL_TRANSCODE_FAILED` | 3 en 10 min | haute | Regrouper par codec/duree et verifier ffmpeg, Storage et memoire. |
| `REDIS_UNAVAILABLE` | present pendant 5 min | moyenne | Verifier quota/facturation Upstash; le repli Firestore est automatique. |
| API `level=error` | 5 en 5 min par `operation` | haute | Utiliser `requestId` pour reconstituer la requete entre Vercel et Functions. |
| Smoke production en echec | 1 execution | haute | Ouvrir l'artefact GitHub Actions avant toute relance manuelle. |

Les seuils sont volontairement prudents pour le trafic actuel. Les ajuster apres deux semaines de donnees, sans desactiver les alertes unitaires de paiement.

## Recherche d'incident

Dans Vercel Logs, filtrer d'abord avec le `requestId` retourne au navigateur, puis avec `incidentCode` ou `operation`. Les lignes sont du JSON compact et peuvent etre exportees sans parser du texte libre.

Dans Google Cloud Logging, les Functions v2 utilisent principalement `cloud_run_revision`. Exemples de filtres :

```text
resource.type="cloud_run_revision"
jsonPayload.incidentCategory="payment_callback"
jsonPayload.incidentCode="AMOUNT_MISMATCH"
```

```text
resource.type="cloud_run_revision"
jsonPayload.incidentCategory="reel_processing"
jsonPayload.incidentCode="REEL_TRANSCODE_FAILED"
```

Ne jamais ajouter le corps d'un callback, un numero, un email, un token ou une signature au ticket d'incident. Conserver uniquement les identifiants techniques deja presents dans les logs structures.

## Cache Firestore temporaire et retour a Redis

Tant que la facturation Upstash n'est pas regularisee, la production utilise explicitement `CACHE_BACKEND=firestore`. Le code conserve le support Redis : a la premiere erreur, `RedisCacheStore` ouvre un circuit de 60 secondes et delegue a `FirestoreCacheStore`. Cela evite qu'une indisponibilite soit interpretee comme un evenement duplique et limite les appels repetes au fournisseur.

Le repli augmente les lectures/ecritures Firestore. Si `REDIS_UNAVAILABLE` dure plus de cinq minutes :

1. Surveiller `_cache_entries` et les couts Firestore pendant la periode temporaire.
2. Regulariser le quota et la facturation Upstash avant toute remise en service.
3. Tester Redis en dev, puis remettre `CACHE_BACKEND=redis` en production.
4. Verifier l'absence de `REDIS_UNAVAILABLE` et conserver le repli automatique.

## Commandes de validation

```bash
cd apps/location-maison
npm run check:types
npm run test:ci
npm run test:rules
npm run test:emulator:api
```

Smoke reel sur les services dev reels :

```bash
CACHE_BACKEND=redis \
LOT6D_CONFIRM_REAL_DEV=1 \
LOT6D_BASE_URL=http://127.0.0.1:3001 \
npm run test:smoke:lot6d
```

Le runner refuse la production et les emulateurs, cree uniquement un reel technique, verifie les compteurs et nettoie Firestore, Redis et le repli Firestore dans `finally`.

## Mise en production

Avant d'activer le workflow programme, deployer l'application contenant `/api/health`. Apres deploiement, lancer `location-maison monitoring` manuellement et verifier ses deux artefacts. Les workflows CI n'effectuent aucun deploiement et n'utilisent aucun secret de production.
