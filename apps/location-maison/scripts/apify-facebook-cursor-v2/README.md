# apify-facebook-cursor-v2

Squelette technique du pipeline d'import annonces agences.

## Commandes

Dry-run avec normalisation IA locale (LM Studio):
```bash
npm run apify:v2:run -- \
  --agency jika-immo \
  --input scripts/apify-facebook-cursor-v2/data/raw/jika-immo-2026-03.json \
  --mode dry-run \
  --ai-model qwen2.5-1.5b-instruct \
  --ai-base-url http://127.0.0.1:1234 \
  --ai-chat-endpoint /api/v1/chat
```

Apply (LM obligatoire):
```bash
npm run apify:v2:run -- \
  --agency jika-immo \
  --input scripts/apify-facebook-cursor-v2/data/raw/jika-immo-2026-03.json \
  --mode apply \
  --ai-model qwen2.5-1.5b-instruct \
  --ai-base-url http://127.0.0.1:1234 \
  --ai-chat-endpoint /api/v1/chat
```

Replay rapport:
```bash
npm run apify:v2:replay -- --report scripts/apify-facebook-cursor-v2/data/reports/<job-id>.report.json
```

## Notes
- Le storage image est en mode `noop` (placeholder) dans ce squelette.
- Le store base est un `json adapter` (artefact staging), pas encore un vrai Firestore repository.
- Les points d'integration Firebase sont a brancher dans `infrastructure/repositories`.
- En sortie, la pipeline ecrit:
  - `data/staging/<job-id>.enriched-posts.json` (resultat apres formatage)
  - `data/staging/<job-id>.mapped-properties.json` (payload annonce final)
  - `data/reports/<job-id>.report.json` (metriques)

## Configuration LM Studio

Variables reconnues:
```bash
APIFY_V2_AI_ENABLED=true
LM_STUDIO_BASE_URL=http://127.0.0.1:1234
LM_STUDIO_MODEL=qwen2.5-1.5b-instruct
LM_STUDIO_CHAT_ENDPOINT=/api/v1/chat
LM_STUDIO_MODELS_ENDPOINT=/api/v1/models
LM_STUDIO_LOAD_MODEL_ENDPOINT=/api/v1/models/load
LM_STUDIO_AUTO_LOAD_MODEL=false
LM_STUDIO_TEMPERATURE=0.2
LM_STUDIO_MAX_TOKENS=700
LM_STUDIO_TIMEOUT_MS=45000
LM_STUDIO_MAX_RETRIES=2
LM_STUDIO_DELAY_MS=120
```

Important:
- La normalisation IA se fait annonce par annonce.
- Le mode LM est force dans le CLI v2 (plus de run standard sans LM).
- Si l'IA echoue ou retourne un JSON invalide, le pipeline applique automatiquement le fallback heuristique.
- Les annonces avec moins de `4` images sont rejetees automatiquement (configurable via `pipeline.minImagesRequired`).
- Les champs de localisation sont ensuite canonises via `src/data/gabon_osm.json`
  (district/city/province + longitude/latitude) pour rester alignes avec le format annonce.
