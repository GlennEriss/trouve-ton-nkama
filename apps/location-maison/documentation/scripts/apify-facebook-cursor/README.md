# Apify Facebook Cursor - Guide Operatoire v2

## Contexte
Ce module couvre le flux mensuel d'import d'annonces Facebook (Apify) pour une agence, puis publication sur Firebase (dev/prod selon environnement).

Exemple agence:
- `agencyKey`: `jika-immo`
- `uid agence`: `rO9AwHrh1aT9S6mbkFsQWKtNJqz2`
- `createdBy import dev demande`: `cd2POQU74IV7F6Rlhm6Nlmz0qUs1`

## Ce qui est implemente
Le pipeline v2 existe et fonctionne en mode batch annonce-par-annonce:
1. Load brut (`data/raw/*.json`)
2. Clean (texte/images/sourceId)
3. Dedupe
4. Enrich:
   - fallback heuristique (titre/description/proprietes)
   - IA locale LM Studio (`/api/v1/chat`) avec fallback auto
   - normalisation localisation via `src/data/gabon_osm.json` (district/city/province + coords)
5. Map vers schema annonce plateforme (conforme `src/models/annonce.d.ts`)
   - Champs type-specifiques assures:
     - `Home`: `nbrRooms`, `nbrChickens`, `nbrBathrooms`, `nbrToilets`, `nbrFloors`, `nbrGarages`, `nbrLivingRoom`
     - `Apartment`: `nbrRooms`, `nbrChickens`, `nbrBathrooms`, `nbrToilets`, `nbrFloorApartment`, `numeroApartment`
     - `Studio`: `nbrRooms`, `nbrChickens`, `nbrBathrooms`, `nbrToilets`, `nbrFloorStudio`, `numeroStudio`
     - `Villa`: `nbrRooms`, `nbrChickens`, `nbrBathrooms`, `nbrToilets`, `nbrFloors`, `nbrGarages`, `nbrLivingRoom`, `nbrPiscine`
     - `Building`: `nbrApartments`, `nbrFloors`, `hasParking`
     - `Desk`: `nbrRooms`, `nbrToilets`
     - `Shop`: `nbrRooms`, `nbrToilet`
     - `Kiosk`: `kioskType`
     - `Room`: `roomType`
6. Prepare images
7. Upsert (dans v2: staging JSON; l'ecriture Firestore est faite par script Firebase dedie)
8. Report JSON

## Dossiers et artefacts
- Input brut: `scripts/apify-facebook-cursor-v2/data/raw/`
- Sorties staging: `scripts/apify-facebook-cursor-v2/data/staging/`
  - `<job-id>.enriched-posts.json`
  - `<job-id>.mapped-properties.json`
- Rapports: `scripts/apify-facebook-cursor-v2/data/reports/`
  - `<job-id>.report.json`
  - `<job-id>.errors.json`

Note: les JSON `raw/staging/reports` sont ignores par git (hors `.gitkeep`).

## Commandes essentielles

### 1) Generer les annonces (dry-run, sans ecriture DB)
```bash
npm run apify:v2:run -- \
  --agency jika-immo \
  --input scripts/apify-facebook-cursor-v2/data/raw/jika-immo-2026-03.json \
  --mode dry-run \
  --job-id jika-immo-2026-03-lmstudio \
  --ai-base-url http://127.0.0.1:1234 \
  --ai-chat-endpoint /api/v1/chat \
  --ai-models-endpoint /api/v1/models \
  --ai-load-model-endpoint /api/v1/models/load \
  --ai-model qwen2.5-1.5b-instruct
```

### 2) Importer en base DEV
```bash
DOTENV_CONFIG_PATH=.env.local \
FIREBASE_STORAGE_BUCKET=location-maison-dev.firebasestorage.app \
CREATED_BY=cd2POQU74IV7F6Rlhm6Nlmz0qUs1 \
node -r dotenv/config scripts/firebase/upload-properties.js \
  --input scripts/apify-facebook-cursor-v2/data/staging/jika-immo-2026-03-lmstudio.mapped-properties.json
```

### 3) Corriger les anciens documents avec champ `id` en base
Dry-run:
```bash
DOTENV_CONFIG_PATH=.env.local \
FIREBASE_STORAGE_BUCKET=location-maison-dev.firebasestorage.app \
CREATED_BY=cd2POQU74IV7F6Rlhm6Nlmz0qUs1 \
node -r dotenv/config scripts/firebase/remove-property-id-field.js \
  --created-by cd2POQU74IV7F6Rlhm6Nlmz0qUs1 \
  --job-id jika-immo-2026-03-lmstudio \
  --dry-run true
```

Apply:
```bash
DOTENV_CONFIG_PATH=.env.local \
FIREBASE_STORAGE_BUCKET=location-maison-dev.firebasestorage.app \
CREATED_BY=cd2POQU74IV7F6Rlhm6Nlmz0qUs1 \
node -r dotenv/config scripts/firebase/remove-property-id-field.js \
  --created-by cd2POQU74IV7F6Rlhm6Nlmz0qUs1 \
  --job-id jika-immo-2026-03-lmstudio
```

### 4) Corriger des documents deja importes sans champs type-specifiques
Dry-run:
```bash
DOTENV_CONFIG_PATH=.env.local.prod \
FIREBASE_STORAGE_BUCKET=location-maison-prod-167da.firebasestorage.app \
CREATED_BY=0tmnIUbOdaa0MP1JIqCryOb7rYG2 \
node -r dotenv/config scripts/firebase/backfill-property-type-fields.js \
  --created-by 0tmnIUbOdaa0MP1JIqCryOb7rYG2 \
  --source facebook_import \
  --dry-run true
```

Apply:
```bash
DOTENV_CONFIG_PATH=.env.local.prod \
FIREBASE_STORAGE_BUCKET=location-maison-prod-167da.firebasestorage.app \
CREATED_BY=0tmnIUbOdaa0MP1JIqCryOb7rYG2 \
node -r dotenv/config scripts/firebase/backfill-property-type-fields.js \
  --created-by 0tmnIUbOdaa0MP1JIqCryOb7rYG2 \
  --source facebook_import \
  --dry-run false
```

## Verification apres run
1. Ouvrir le report:
   - `scripts/apify-facebook-cursor-v2/data/reports/<job-id>.report.json`
   - `scripts/apify-facebook-cursor-v2/data/reports/<job-id>.errors.json`
2. Lire:
   - `aiAttempted`, `aiSuccess`, `aiFallback`
   - `aiFallbackByReason`
   - `aiErrors` (dans le fichier `.errors.json`, avec details HTTP/variants)
   - `locationResolved`
3. Verifier que les URLs de details utilisent bien `doc.id` Firestore.

## Points importants
- Le mode LM est force dans le CLI v2: chaque annonce passe d'abord par LM puis fallback si echec.
- Une annonce avec moins de 4 images est automatiquement ignoree a l'etape `02-clean`.
- La localisation est canonisee via OSM meme sans IA.
- Le champ `id` ne doit jamais etre stocke dans le document Firestore.

## Documents lies
- [Architecture](/Users/glenneriss/Documents/projets/location-maison/documentation/scripts/apify-facebook-cursor/ARCHITECTURE.md)
- [Configuration Agences](/Users/glenneriss/Documents/projets/location-maison/documentation/scripts/apify-facebook-cursor/CONFIGURATION-AGENCES.md)
- [Plan de Migration](/Users/glenneriss/Documents/projets/location-maison/documentation/scripts/apify-facebook-cursor/MIGRATION-PLAN.md)
