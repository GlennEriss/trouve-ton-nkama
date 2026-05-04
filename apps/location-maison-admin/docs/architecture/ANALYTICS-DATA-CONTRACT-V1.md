# Analytics Data Contract v1 (Events + API Payloads + Validation Rules)

## 1. Statut du document

- Version: `v1.0.0`
- Date de gel: `2026-05-04`
- Statut: `Ready for implementation`
- Portee: Sprint Analytics MVP (recherches, presence, visites)

Ce document est le contrat technique de reference pour l'implementation des flux analytics du dashboard admin.

## 2. Objectif et perimetre

Objectif:

- Standardiser les events metier analytics.
- Definir les payloads API v1 (ingestion + lecture dashboard).
- Definir les regles de validation strictes, pretes a coder.

In-scope MVP:

- `search_performed`
- `search_result_returned`
- `user_presence_heartbeat`
- `platform_visit`

Out-of-scope MVP (v1.x+):

- tracking comportemental fin par parcours multi-etapes
- attribution marketing avancee multi-touch
- modeles predictifs/ML

## 3. Envelope evenement canonique

Tous les events doivent respecter cette structure commune.

```json
{
  "event_id": "evt_01JVGW7XQJZB4YFMH51Y8YH6P0",
  "event_name": "search_performed",
  "schema_version": "1.0.0",
  "occurred_at": "2026-05-04T09:00:00.000Z",
  "source": "catalog_search_page",
  "environment": "prod",
  "correlation_id": "c_01JVGW88Q5Y70M0N0WCN5GZV7G",
  "actor": {
    "actor_type": "user",
    "actor_id": "uid_abc123",
    "is_authenticated": true
  },
  "session": {
    "session_id": "sess_01JVGW7YJ4K3KBVNH7AT0PMQ6E",
    "ip_hash": "sha256:9f41...",
    "user_agent_hash": "sha256:33de..."
  },
  "payload": {}
}
```

Regles envelope:

- `event_id`: string non vide (ULID/UUID recommande), unique par event.
- `event_name`: enum strict (4 valeurs MVP).
- `schema_version`: `1.0.0` pour MVP.
- `occurred_at`: ISO-8601 UTC (`Z`), rejet si > `now + 5 min`.
- `source`: enum strict (voir section 4).
- `environment`: `dev | preprod | prod`.
- `correlation_id`: obligatoire cote ingestion (trace end-to-end).
- `payload`: objet strict, dependant de `event_name`.

## 4. Contrat des 4 events MVP

## 4.1 `search_performed`

But: tracer la demande de recherche emise depuis la plateforme.

`source` autorise:

- `catalog_search_page` (https://www.tonnkama.com/search)
- `location_maison_search_bar`

Payload:

```json
{
  "search_id": "srch_01JVGW9G6K2K6HTV5QE1Y5TDP4",
  "query_text_raw": "villa piscine dakar",
  "query_text_normalized": "villa piscine dakar",
  "filters": {
    "property_types": ["villa"],
    "city": "dakar",
    "district": "almadies",
    "price_min": 200000,
    "price_max": 800000,
    "currency": "XOF",
    "bedrooms_min": 3,
    "status": "FOR_RENT"
  },
  "sort": "relevance",
  "page": 1,
  "page_size": 20
}
```

Validation:

- `search_id`: obligatoire, unique par recherche utilisateur.
- `query_text_raw`: max 160 chars (trim).
- `query_text_normalized`: lowercase + espaces normalises (genere serveur si absent).
- `filters.property_types`: max 10 valeurs.
- `price_min` et `price_max`: entiers >= 0, et `price_min <= price_max`.
- `currency`: enum MVP `XOF | EUR | USD`.
- `status`: enum MVP `FOR_RENT | FOR_SALE` (aligne avec `location-maison/src/constantes/index.ts`).
- `page`: int >= 1.
- `page_size`: int entre 1 et 100.
- Regle cross-field: au moins un critere doit exister (`query_text_raw` non vide OU `filters` non vide).

## 4.2 `search_result_returned`

But: tracer le resultat effectivement retourne pour une recherche.

Payload:

```json
{
  "search_id": "srch_01JVGW9G6K2K6HTV5QE1Y5TDP4",
  "results_count": 18,
  "has_results": true,
  "result_ids_sample": ["ann_1001", "ann_1002"],
  "execution_ms": 234,
  "engine": "catalog_index_v1"
}
```

Validation:

- `search_id`: obligatoire, doit correspondre a un `search_performed` connu.
- `results_count`: int entre 0 et 10000.
- `has_results`: doit etre coherent avec `results_count > 0`.
- `result_ids_sample`: max 20 ids, obligatoire vide si `has_results=false`.
- `execution_ms`: int >= 0 et <= 30000.
- `engine`: string max 64.
- Timeout de correlation: si `search_id` inconnu au bout de 24h, event route vers DLQ + alerte.

## 4.3 `user_presence_heartbeat`

But: consolider presence temps reel et derniere activite (admins + utilisateurs).

Payload:

```json
{
  "presence_subject": "user",
  "subject_id": "uid_abc123",
  "session_id": "sess_01JVGW7YJ4K3KBVNH7AT0PMQ6E",
  "status": "online",
  "last_seen_at": "2026-05-04T09:01:12.000Z",
  "device_type": "mobile",
  "app_surface": "web"
}
```

Validation:

- `presence_subject`: `user | admin`.
- `subject_id`: obligatoire.
- `session_id`: obligatoire.
- `status`: `online | offline`.
- `last_seen_at`: ISO-8601 UTC.
- `device_type`: `mobile | desktop | tablet | unknown`.
- `app_surface`: `web | mobile_app` (MVP attendu: `web`).
- Regle de freshness: heartbeat stale apres 5 min sans nouvel event.

## 4.4 `platform_visit`

But: centraliser les metriques de visites de Firebase/Vercel dans une forme unifiee.

`source` autorise:

- `firebase_analytics`
- `vercel_analytics`

Payload:

```json
{
  "provider_event_id": "firebase:2026-05-04:page_view:/search",
  "metric_name": "page_view",
  "metric_value": 1,
  "page_path": "/search",
  "route": "/search",
  "referrer_host": "google.com",
  "country": "SN",
  "device_category": "mobile"
}
```

Validation:

- `provider_event_id`: obligatoire, unique dans `(source, provider_event_id)`.
- `metric_name`: enum MVP `visit | unique_visitor | page_view`.
- `metric_value`: nombre > 0.
- `page_path`: commence par `/` si present, max 512 chars.
- `country`: code ISO alpha-2 si present.
- `device_category`: `mobile | desktop | tablet | unknown`.
- Dedupe obligatoire sur `(source, provider_event_id)`.

## 4.5 Enums figes MVP (source metier)

Source metier de reference: projet `location-maison`.

Types de bien recherches (`typeProperty`):

- `Home`
- `Apartment`
- `Studio`
- `Villa`
- `Room`
- `Kiosk`
- `Shop`
- `Desk`
- `Building`
- `Land`

Note:

- `Property` et `Logement` existent dans certains artefacts techniques mais ne sont pas retenus dans les filtres analytics utilisateur MVP.

Statut annonce (`status`):

- `FOR_RENT`
- `FOR_SALE`

Sources de recherche MVP:

- `catalog_search_page`
- `location_maison_search_bar`

Sources visites MVP:

- `firebase_analytics`
- `vercel_analytics`

Parametres URL search a tracer (catalogue):

- `query`
- `province`
- `city`
- `street`
- `minPrice`
- `maxPrice`
- `minArea`
- `maxArea`
- `minNbrRooms`
- `maxNbrRooms`
- `typeProperty`
- `status`
- `tags`

Dictionnaire tags autorises MVP:

- `Travail`
- `Famille`
- `Couple`
- `Villa`
- `Sous barrière`
- `Meublé`
- `Centre-ville`
- `Vacances`
- `Nature`
- `Montagne`
- `Piscine`
- `Animaux admis`
- `Commerces proches`
- `Transport proche`
- `Parking`
- `Wi-Fi`
- `Sécurisé`
- `Vélo`
- `Activités sportives`
- `Adapté aux enfants`
- `Accessible handicapés`
- `Étudiant`
- `Calme et tranquillité`
- `Proche de la plage`
- `Duplex`
- `Boutique`
- `Balcon`
- `Terrasse`
- `Collocation`
- `Garage`
- `Court séjour`
- `Propriétaire`
- `Agence`

## 5. Schema de donnees (tables/champs)

## 5.1 Tables raw (ingestion)

### `analytics_events_raw`

Colonnes minimales:

- `event_id` STRING (PK logique)
- `event_name` STRING
- `schema_version` STRING
- `occurred_at` TIMESTAMP
- `received_at` TIMESTAMP
- `source` STRING
- `environment` STRING
- `correlation_id` STRING
- `actor_type` STRING NULL
- `actor_id` STRING NULL
- `is_authenticated` BOOL NULL
- `session_id` STRING NULL
- `ip_hash` STRING NULL
- `user_agent_hash` STRING NULL
- `payload_json` JSON
- `ingestion_status` STRING (`accepted|rejected|quarantined`)
- `ingestion_error_code` STRING NULL

Index/partition:

- partition par date `occurred_at`
- cluster par `event_name`, `source`, `environment`
- contrainte d'unicite logique sur `event_id`

## 5.2 Tables metier dediees (projection)

### `search_events`

- projection de `search_performed` et `search_result_returned`
- cle metier: `search_id`
- champs cibles: `query_text_normalized`, `filters_json`, `results_count`, `has_results`, `execution_ms`, `source`, `occurred_at`

### `presence_events`

- projection de `user_presence_heartbeat`
- cle metier: `(presence_subject, subject_id, session_id, occurred_at)`
- champs cibles: `status`, `last_seen_at`, `device_type`

### `traffic_events_raw`

- projection de `platform_visit`
- cle metier: `(source, provider_event_id)`
- champs cibles: `metric_name`, `metric_value`, `page_path`, `country`, `device_category`, `occurred_at`

## 5.3 Tables agregats dashboard

- `search_metrics_daily`
- `presence_snapshots_5min`
- `traffic_metrics_daily`
- `traffic_comparison_daily`

Regle de fraicheur MVP:

- presence: <= 30 sec (projection Redis/Firestore)
- recherches: <= 5 min
- visites Firebase/Vercel: <= 15 min

## 6. Contrat API v1 - Ingestion

## 6.1 Endpoint principal

- `POST /api/admin/v1/analytics/events:ingest`

Headers obligatoires:

- `Content-Type: application/json`
- `X-Correlation-Id: <id>`
- `Idempotency-Key: <uuid-or-ulid>`
- `X-Analytics-Source: firebase|vercel|location-maison`

Auth:

- service-to-service uniquement (pas de cookie admin navigateur)
- JWT service account + allowlist IP/provider

Request body:

```json
{
  "batch_id": "batch_01JVGWD56CFCAC4P4JQ6BQ2N7P",
  "sent_at": "2026-05-04T09:05:00.000Z",
  "events": []
}
```

Validation body:

- `events.length`: 1 a 500.
- taille body max: 1 MB.
- batch rejete si `events` vide.
- dedupe batch par `batch_id` + `Idempotency-Key`.

Success response (202):

```json
{
  "success": true,
  "data": {
    "batch_id": "batch_01JVGWD56CFCAC4P4JQ6BQ2N7P",
    "accepted": 480,
    "rejected": 20,
    "quarantined": 0
  },
  "error": null,
  "meta": {
    "correlationId": "c_01JVGW88Q5Y70M0N0WCN5GZV7G",
    "version": "v1"
  }
}
```

## 6.2 Endpoint de relecture erreurs

- `GET /api/admin/v1/analytics/events/rejections?range=7d&eventName=search_performed`

But:

- diagnostiquer rapidement les payloads rejetes pendant l'integration.

## 7. Contrat API v1 - Lecture Dashboard

## 7.1 Recherches

- `GET /api/admin/v1/analytics/searches?range=7d&source=all|catalog_search_page|location_maison_search_bar`
- `GET /api/admin/v1/analytics/searches/top-queries?range=7d&limit=50`
- `GET /api/admin/v1/analytics/searches/result-rate?range=7d`

Validation query params:

- `range`: enum `24h|7d|30d|custom` (defaut `7d`).
- `start` et `end` obligatoires si `range=custom`.
- `limit`: int 1..200.

## 7.2 Presence

- `GET /api/admin/v1/analytics/presence/users-online`
- `GET /api/admin/v1/analytics/presence/admins-online`
- `GET /api/admin/v1/analytics/presence/users-last-seen?limit=100&cursor=...`
- `GET /api/admin/v1/analytics/presence/admins-last-login?limit=100&cursor=...`

Validation query params:

- `limit`: int 1..500 (defaut 100).
- `cursor`: string opaque.

## 7.3 Visites

- `GET /api/admin/v1/analytics/traffic?range=7d&provider=all|firebase|vercel`
- `GET /api/admin/v1/analytics/traffic/compare?range=7d`

Validation query params:

- `provider`: enum strict.
- `range`: meme contrat que recherches.

## 8. Regles de validation transverses (strict mode)

- Reject unknown keys (`zod.strict()` sur tous les objets).
- Strings: trim + longueur max definie par champ.
- Numeriques: bornes explicites, pas de `NaN`, pas d'infini.
- Dates: ISO UTC uniquement.
- Enums: reject valeur hors liste.
- Coherence inter-champs:
  - `has_results === (results_count > 0)`
  - `price_min <= price_max`
  - `range=custom` => `start` + `end` obligatoires
- Idempotence:
  - `Idempotency-Key` obligatoire sur ingestion
  - replay meme cle + payload identique => reponse succes deja-traitee
  - replay meme cle + payload different => `409 CONFLICT`

## 9. Regles securite et conformite data

- RBAC lecture analytics:
  - `analytics.search_read`
  - `analytics.traffic_read`
- Endpoint ingestion non expose au navigateur admin.
- Pas de PII brute dans analytics raw:
  - stocker `ip_hash`, jamais IP claire
  - stocker `user_agent_hash`, jamais user-agent brut
- Retention MVP:
  - raw events: 12 mois
  - aggregats daily: 24 mois
  - erreurs ingestion: 30 jours

## 10. Rattachement implementation (sprint)

Definition of Ready pour coder Sprint Analytics:

- contrats payload valides metier + tech
- liste enums figee
- strategy idempotence validee
- DDL tables raw/projections/agregats valide

Definition of Done Sprint Analytics:

- ingestion batch en dev stable
- dashboard range `7d` operationnel par defaut
- comparatif visites Firebase/Vercel visible
- alertes sur rejets events actives
- documentation synchronisee
