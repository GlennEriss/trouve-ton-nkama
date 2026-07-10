# Plan de Migration (Legacy -> V2)

## Objectif
Migrer progressivement les scripts `scripts/apify-facebook-cursor/*` vers un pipeline modulaire, sans interrompre les imports mensuels.

## Phase 0 - Stabilisation legacy
- Geler les scripts legacy critiques (pas de nouvelle logique metier dedans).
- Ajouter un script "runner legacy" unique qui enchaine les etapes existantes.
- Produire un rapport minimal (entrees/sorties/erreurs).

Livrable:
- `scripts/apify-facebook-cursor/legacy-runner.js`

## Phase 1 - Encapsulation des etapes
- Extraire chaque etape dans une interface commune:
  - `step.execute(context): StepResult`
- Envelopper les scripts existants dans des "adapters step".

Livrable:
- `v2/pipeline/steps/` avec wrappers autour du legacy.

## Phase 2 - Configuration agences
- Introduire `agencies.json`.
- Remplacer tous les uid hardcodes par la resolution config.
- Ajouter `--agency` obligatoire.

Livrable:
- `v2/config/agencies.json`
- validation config au demarrage.

## Phase 3 - Refactor metier
- Remplacer progressivement les scripts ad-hoc par modules testables:
  - dedupe
  - enrichissement texte
  - extraction attributs
  - mapping final Property

Livrable:
- modules `domain/services/*`.

## Phase 4 - Publication robuste
- Isoler upload images et upsert DB via repositories.
- Ajouter idempotence (fingerprint + check existant).
- Ajouter mode `dry-run` et `apply`.

Livrable:
- `PropertyRepository`, `ImageRepository`, `run-job`.

## Phase 5 - Observabilite & Ops
- Rapport JSON + resume console.
- logs structures par `jobId`.
- commande `replay-job`.

Livrable:
- `data/reports/<jobId>.json`
- dashboard simple ops (optionnel plus tard).

---

## Mapping scripts legacy -> etapes cibles
- `process-new-json.js`, `create-property-json.js`, `save-json.js`
  - `01-load-raw`
- `extract-properties.js`, `extract-property-attributes.js`, `complete-missing-data.js`
  - `02-clean`, `04-enrich`, `05-map-property`
- `remove-duplicates.js`, `remove-duplicates-aggressive.js`
  - `03-dedupe`
- `fix-locations-from-osm.js`, `fix-prices*`, `fix-room-types*`, `fix-studio-types*`
  - `04-enrich` (rules engine)
- scripts de sauvegarde BD/upload
  - `06-upload-images`, `07-upsert-db`

## Criteres d'acceptation
- Meme (ou meilleur) volume d'annonces publiees que le pipeline legacy.
- 0 duplication inter-run pour une meme agence/periode.
- 100% des annonces publiees rattachees au bon `uid` agence.
- Rapport d'execution disponible pour chaque run.

## Runbook mensuel cible
1. Scraper et deposer le JSON brut (`data/raw/...`).
2. Lancer:
   - `run-job --agency jika-immo --input data/raw/... --mode dry-run`
3. Verifier rapport.
4. Relancer:
   - `run-job --agency jika-immo --input data/raw/... --mode apply`
5. Archiver rapport + artefacts.

