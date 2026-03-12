# Architecture Cible (Professionnelle)

## Principes
- Separation claire des responsabilites.
- Idempotence a chaque etape (rejouable sans duplication).
- Traceabilite complete (job id, agence, run date, stats).
- "Fail-safe": un post en echec ne bloque pas tout le lot.
- Config driven: agences et regles hors code.

## Design Patterns recommandes
- `Pipeline Pattern`: orchestration par etapes (`extract -> clean -> dedupe -> enrich -> map -> persist`).
- `Strategy Pattern`: extracteurs/normaliseurs specifiques source (Facebook aujourd'hui, autres demain).
- `Repository Pattern`: acces base/storage abstrait (`PropertyRepository`, `ImageRepository`).
- `Factory Pattern`: creation des `JobContext` et clients infra (Firebase, Apify, Storage).
- `Result/Either Pattern`: resultat standard par etape (`success`, `warnings`, `errors`, `metrics`).

## Bounded Contexts
- `Ingestion`: acquisition du brut (Apify + fichiers JSON).
- `Transformation`: nettoyage, dedoublonnage, enrichissement.
- `Publication`: upload images + upsert annonces.
- `Operations`: logs, rapports, reprise sur incident, dry-run.

## Architecture en couches
1. `domain`
- Entites: `Agency`, `RawPost`, `PropertyCandidate`, `PropertyImportResult`
- Services metier: `DuplicateDetector`, `PropertyEnricher`, `QualityScorer`

2. `application`
- Use cases: `RunAgencyImportJob`, `ProcessRawBatch`, `PublishProperties`
- Ports (interfaces): `RawSourcePort`, `ImageStoragePort`, `PropertyStorePort`, `ReportPort`

3. `infrastructure`
- Adapters concrets:
  - Apify adapter
  - Firebase Storage adapter
  - Firestore/DB adapter
  - File system adapter
  - Logger adapter

4. `presentation/cli`
- Commandes:
  - `run-job`
  - `replay-job`
  - `validate-batch`
  - `report-job`

## Structure de dossiers cible (proposition)
```txt
scripts/apify-facebook-cursor-v2/
  src/
    cli/
      run-job.ts
      replay-job.ts
    application/
      use-cases/
        run-agency-import-job.ts
      dto/
      ports/
    domain/
      entities/
      services/
      rules/
    infrastructure/
      apify/
      firebase/
      storage/
      fs/
      logging/
    pipeline/
      steps/
        01-load-raw.ts
        02-clean.ts
        03-dedupe.ts
        04-enrich.ts
        05-map-property.ts
        06-upload-images.ts
        07-upsert-db.ts
        08-report.ts
    shared/
      errors/
      utils/
      types/
  config/
    agencies.json
    pipeline.defaults.json
  data/
    raw/
    staging/
    reports/
```

## Etat reel actuellement implemente
Le flux est operationnel avec cette separation:

1. `scripts/apify-facebook-cursor-v2` (pipeline de transformation)
- Orchestration par steps `01..08`
- Mode `dry-run` principal pour produire des artefacts
- Enrichissement par fallback heuristique
- Enrichissement IA local (LM Studio) annonce par annonce
- Normalisation localisation OSM Gabon

2. `scripts/firebase/upload-properties.js` (publication Firebase)
- Lit le `mapped-properties.json` genere par v2
- Uploade les images (ou conserve URL externe)
- Ecrit dans `properties` Firestore
- Force `createdBy` via env `CREATED_BY`
- Ne stocke plus le champ `id` dans le document

3. `scripts/firebase/remove-property-id-field.js` (maintenance)
- Nettoie les anciens documents qui contiennent `id` / `objectID`
- Permet `--dry-run true` puis apply

## Sequence d'execution recommandee
1. Scraper et deposer le brut dans `data/raw/*.json`
2. Lancer v2 (dry-run) pour generer:
   - `enriched-posts.json`
   - `mapped-properties.json`
   - `report.json`
3. Verifier le report (`aiSuccess`, `aiFallback`, `locationResolved`)
4. Lancer upload Firebase avec `mapped-properties.json`
5. Si necessaire, lancer le script de nettoyage `id/objectID`

## IA locale (LM Studio)
Endpoints supportes:
- `/api/v1/models`
- `/api/v1/chat`
- `/api/v1/models/load`

Parametres utiles:
- `--ai`
- `--ai-base-url http://127.0.0.1:1234`
- `--ai-chat-endpoint /api/v1/chat`
- `--ai-model qwen2.5-1.5b-instruct`
- fallback automatique si IA indisponible ou JSON invalide

## Canonisation localisation (OSM)
Source:
- `src/data/gabon_osm.json`

Mecanisme:
- matching textuel sur description/titre/zone
- rattachement quartier -> ville -> province
- assignation des coordonnees (`longitude`, `latitude`)
- sortie conforme au modele annonce (`street/city/province/coords`)

## Decision importante sur les IDs
- L'ID fonctionnel d'une annonce = `doc.id` Firestore.
- Interdiction de persister un champ `id` dans le document.
- Les lecteurs backend doivent construire l'objet sous la forme:
  - `{ ...doc.data(), id: doc.id }`
  et non l'inverse.

## Modele de donnees pipeline
- `ImportJob`
  - `jobId`
  - `agencyKey`
  - `agencyUid`
  - `period`
  - `sourceFile`
  - `mode`: `dry-run | apply`
  - `status`

- `PostProcessingRecord`
  - `postId/sourceId`
  - `fingerprint`
  - `validationErrors[]`
  - `warnings[]`
  - `mappedProperty?`
  - `persistedPropertyId?`

## Convention de fingerprint (idempotence)
Fingerprint stable propose:
- Priorite 1: id source Facebook (si fiable)
- Priorite 2: hash(normalized text + first image key + agency uid)
- Priorite 3: hash(title + price + contact + area + city)

Utilisations:
- dedoublonnage intra-fichier
- dedoublonnage inter-run
- prevention de creations multiples en base

## Observabilite
- Log structure JSON:
  - `timestamp`
  - `scope`
  - `jobId`
  - `agencyKey`
  - `step`
  - `message`
  - `context`
- Rapport final:
  - `total_raw`
  - `total_valid`
  - `duplicates_removed`
  - `images_uploaded`
  - `db_upserts`
  - `errors_by_type`

## Regles de qualite
- Une annonce est publiable si:
  - titre non vide
  - description utile
  - au moins 1 image valide
  - prix coherent (ou statut "prix non renseigne" selon regle)
  - `createdBy` force a l'uid agence configuree

## Securite et gouvernance
- Interdire uid "en dur" dans les scripts metier.
- L'uid vient uniquement de la config agence.
- Support `dry-run` obligatoire avant `apply`.
- Journaliser toutes les ecritures en base.
