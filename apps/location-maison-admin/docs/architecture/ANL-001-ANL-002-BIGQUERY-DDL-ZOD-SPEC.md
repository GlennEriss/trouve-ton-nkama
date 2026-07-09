# ANL-001 / ANL-002 - BigQuery DDL + Zod Validation Spec

## 1. Scope

This document covers implementation-ready artifacts for:

- `ANL-001`: BigQuery dataset/tables DDL
- `ANL-002`: ingestion API validation contract (Zod pseudo-code)

Reference:

- `docs/architecture/ANALYTICS-DATA-CONTRACT-V1.md`

## 2. Naming and environment conventions

Runtime variables:

- `GCP_PROJECT_ID`: ex `location-maison-dev`
- `BQ_DATASET`: ex `admin_analytics_dev` (dev), `admin_analytics_prod` (prod)

Full object format:

- `` `${GCP_PROJECT_ID}.${BQ_DATASET}.table_name` ``

Recommendation:

- keep separated datasets per env (`dev`, `preprod`, `prod`)
- do not mix env data in same dataset

## 3. BigQuery DDL (ANL-001)

## 3.1 Dataset creation

```sql
CREATE SCHEMA IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET`
OPTIONS(
  location = "EU",
  description = "Admin analytics dataset - Trouve Ton Nkama"
);
```

## 3.2 Raw ingestion table

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.analytics_events_raw` (
  event_id STRING NOT NULL,
  event_name STRING NOT NULL,
  schema_version STRING NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  received_at TIMESTAMP NOT NULL,
  source STRING NOT NULL,
  environment STRING NOT NULL,
  correlation_id STRING NOT NULL,

  actor_type STRING,
  actor_id STRING,
  is_authenticated BOOL,

  session_id STRING,
  ip_hash STRING,
  user_agent_hash STRING,

  payload_json JSON NOT NULL,

  ingestion_status STRING NOT NULL,
  ingestion_error_code STRING,
  ingestion_error_message STRING,

  batch_id STRING,
  idempotency_key STRING,
  payload_fingerprint STRING,
  ingested_by STRING,

  PRIMARY KEY (event_id) NOT ENFORCED
)
PARTITION BY DATE(occurred_at)
CLUSTER BY event_name, source, environment
OPTIONS(
  require_partition_filter = TRUE,
  description = "Canonical raw analytics events"
);
```

## 3.3 Rejections table

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.analytics_events_rejections` (
  rejection_id STRING NOT NULL,
  event_id STRING,
  event_name STRING,
  source STRING,
  environment STRING,

  rejection_reason_code STRING NOT NULL,
  rejection_reason_message STRING NOT NULL,
  validation_issues_json JSON,

  raw_event_json JSON,
  batch_id STRING,
  idempotency_key STRING,
  correlation_id STRING,

  rejected_at TIMESTAMP NOT NULL,

  PRIMARY KEY (rejection_id) NOT ENFORCED
)
PARTITION BY DATE(rejected_at)
CLUSTER BY event_name, source, rejection_reason_code
OPTIONS(
  require_partition_filter = TRUE,
  description = "Rejected analytics events for debugging"
);
```

## 3.4 Projection table: search events

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.search_events` (
  search_id STRING NOT NULL,

  search_performed_event_id STRING,
  search_result_event_id STRING,

  source STRING NOT NULL,
  occurred_at TIMESTAMP NOT NULL,

  query_text_raw STRING,
  query_text_normalized STRING,
  filters_json JSON,

  page INT64,
  page_size INT64,

  results_count INT64,
  has_results BOOL,
  result_ids_sample_json JSON,
  execution_ms INT64,
  engine STRING,

  actor_id STRING,
  is_authenticated BOOL,
  session_id STRING,

  correlation_id STRING,

  PRIMARY KEY (search_id) NOT ENFORCED
)
PARTITION BY DATE(occurred_at)
CLUSTER BY source, query_text_normalized, has_results
OPTIONS(
  require_partition_filter = TRUE,
  description = "Search lifecycle projection (performed + returned)"
);
```

## 3.5 Projection table: presence events

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.presence_events` (
  event_id STRING NOT NULL,

  presence_subject STRING NOT NULL,
  subject_id STRING NOT NULL,
  session_id STRING NOT NULL,

  status STRING NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  device_type STRING,
  app_surface STRING,

  source STRING NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  correlation_id STRING,

  PRIMARY KEY (event_id) NOT ENFORCED
)
PARTITION BY DATE(occurred_at)
CLUSTER BY presence_subject, status, subject_id
OPTIONS(
  require_partition_filter = TRUE,
  description = "Presence heartbeat projection"
);
```

## 3.6 Projection table: traffic events

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.traffic_events_raw` (
  source STRING NOT NULL,
  provider_event_id STRING NOT NULL,

  metric_name STRING NOT NULL,
  metric_value FLOAT64 NOT NULL,

  page_path STRING,
  route STRING,
  referrer_host STRING,
  country STRING,
  device_category STRING,

  occurred_at TIMESTAMP NOT NULL,
  correlation_id STRING,

  PRIMARY KEY (source, provider_event_id) NOT ENFORCED
)
PARTITION BY DATE(occurred_at)
CLUSTER BY source, metric_name, page_path
OPTIONS(
  require_partition_filter = TRUE,
  description = "Unified traffic events from Firebase/Vercel"
);
```

## 3.7 Aggregates: search metrics daily

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.search_metrics_daily` (
  date_key DATE NOT NULL,
  source STRING NOT NULL,

  total_searches INT64 NOT NULL,
  searches_with_results INT64 NOT NULL,
  searches_without_results INT64 NOT NULL,
  success_rate FLOAT64 NOT NULL,

  avg_results_count FLOAT64,
  top_queries_json JSON,
  top_property_types_json JSON,
  top_status_json JSON,

  updated_at TIMESTAMP NOT NULL,

  PRIMARY KEY (date_key, source) NOT ENFORCED
)
PARTITION BY date_key
CLUSTER BY source
OPTIONS(
  require_partition_filter = TRUE,
  description = "Daily search KPIs"
);
```

## 3.8 Aggregates: presence snapshots 5min

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.presence_snapshots_5min` (
  bucket_start TIMESTAMP NOT NULL,
  bucket_end TIMESTAMP NOT NULL,

  subject_type STRING NOT NULL,
  online_count INT64 NOT NULL,
  offline_count INT64 NOT NULL,

  updated_at TIMESTAMP NOT NULL,

  PRIMARY KEY (bucket_start, subject_type) NOT ENFORCED
)
PARTITION BY DATE(bucket_start)
CLUSTER BY subject_type
OPTIONS(
  require_partition_filter = TRUE,
  description = "Presence snapshots each 5 minutes"
);
```

## 3.9 Aggregates: traffic metrics daily

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.traffic_metrics_daily` (
  date_key DATE NOT NULL,
  provider STRING NOT NULL,

  visits INT64,
  unique_visitors INT64,
  page_views INT64,
  bounce_rate FLOAT64,
  avg_session_duration_sec FLOAT64,

  top_pages_json JSON,
  updated_at TIMESTAMP NOT NULL,

  PRIMARY KEY (date_key, provider) NOT ENFORCED
)
PARTITION BY date_key
CLUSTER BY provider
OPTIONS(
  require_partition_filter = TRUE,
  description = "Daily traffic KPIs by provider"
);
```

## 3.10 Aggregates: traffic comparison daily

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.traffic_comparison_daily` (
  date_key DATE NOT NULL,

  firebase_visits INT64,
  vercel_visits INT64,
  delta_visits INT64,
  delta_percent FLOAT64,

  firebase_page_views INT64,
  vercel_page_views INT64,

  updated_at TIMESTAMP NOT NULL,

  PRIMARY KEY (date_key) NOT ENFORCED
)
PARTITION BY date_key
OPTIONS(
  require_partition_filter = TRUE,
  description = "Daily Firebase vs Vercel comparison"
);
```

## 3.11 Optional utility table: idempotency registry

```sql
CREATE TABLE IF NOT EXISTS `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.ingestion_idempotency_registry` (
  idempotency_key STRING NOT NULL,
  request_fingerprint STRING NOT NULL,
  first_seen_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  request_status STRING NOT NULL,
  correlation_id STRING,

  PRIMARY KEY (idempotency_key) NOT ENFORCED
)
PARTITION BY DATE(first_seen_at)
CLUSTER BY request_status
OPTIONS(
  require_partition_filter = TRUE,
  description = "Idempotency registry (audit/support)"
);
```

## 3.12 Post-DDL smoke checks

```sql
-- 1) Check objects exist
SELECT table_name
FROM `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.INFORMATION_SCHEMA.TABLES`
ORDER BY table_name;

-- 2) Check partitioning and clustering
SELECT
  table_name,
  partitioning_column,
  clustering_ordinal_position,
  clustering_column
FROM `YOUR_GCP_PROJECT.YOUR_BQ_DATASET.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name IN (
  'analytics_events_raw',
  'search_events',
  'presence_events',
  'traffic_events_raw',
  'search_metrics_daily',
  'presence_snapshots_5min',
  'traffic_metrics_daily',
  'traffic_comparison_daily'
)
ORDER BY table_name, clustering_ordinal_position;
```

## 4. Zod pseudo-code contract (ANL-002)

Note:

- pseudo-code only; adapt names and imports to project modules
- all schemas must run in strict mode

## 4.1 Shared enums

```ts
const EventName = z.enum([
  "search_performed",
  "search_result_returned",
  "user_presence_heartbeat",
  "platform_visit",
]);

const Environment = z.enum(["dev", "preprod", "prod"]);

const SearchSource = z.enum(["catalog_search_page", "location_maison_search_bar"]);
const VisitSource = z.enum(["firebase_analytics", "vercel_analytics"]);

const PropertyType = z.enum([
  "Home", "Apartment", "Studio", "Villa", "Room",
  "Kiosk", "Shop", "Desk", "Building", "Land",
]);

const PropertyStatus = z.enum(["FOR_RENT", "FOR_SALE"]);

const PresenceSubject = z.enum(["user", "admin"]);
const PresenceStatus = z.enum(["online", "offline"]);

const DeviceType = z.enum(["mobile", "desktop", "tablet", "unknown"]);
const AppSurface = z.enum(["web", "mobile_app"]);

const MetricName = z.enum(["visit", "unique_visitor", "page_view"]);
const Currency = z.enum(["XOF", "EUR", "USD"]);
```

## 4.2 Shared primitives

```ts
const IdSchema = z.string().trim().min(1).max(128);
const IsoDateTimeUtc = z.iso.datetime().refine((v) => v.endsWith("Z"), "UTC Z required");

const HashSchema = z.string().trim().regex(/^sha256:[a-f0-9]{16,128}$/i);
```

## 4.3 Envelope schema

```ts
const EventEnvelopeSchema = z.object({
  event_id: IdSchema,
  event_name: EventName,
  schema_version: z.literal("1.0.0"),
  occurred_at: IsoDateTimeUtc,
  source: z.string().trim().min(1).max(64),
  environment: Environment,
  correlation_id: IdSchema,
  actor: z.object({
    actor_type: z.enum(["user", "admin", "system"]).optional(),
    actor_id: IdSchema.optional(),
    is_authenticated: z.boolean().optional(),
  }).strict().optional(),
  session: z.object({
    session_id: IdSchema,
    ip_hash: HashSchema.optional(),
    user_agent_hash: HashSchema.optional(),
  }).strict().optional(),
  payload: z.unknown(),
}).strict();
```

## 4.4 Payload schemas

```ts
const SearchPerformedPayloadSchema = z.object({
  search_id: IdSchema,
  query_text_raw: z.string().trim().max(160).optional(),
  query_text_normalized: z.string().trim().max(160).optional(),
  filters: z.object({
    property_types: z.array(PropertyType).max(10).optional(),
    province: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    street: z.string().trim().max(180).optional(),
    price_min: z.number().int().min(0).optional(),
    price_max: z.number().int().min(0).optional(),
    min_area: z.number().int().min(0).optional(),
    max_area: z.number().int().min(0).optional(),
    min_nbr_rooms: z.number().int().min(0).optional(),
    max_nbr_rooms: z.number().int().min(0).optional(),
    status: PropertyStatus.optional(),
    tags: z.array(z.string().trim().min(1).max(64)).max(33).optional(),
    currency: Currency.optional(),
  }).strict().optional(),
  sort: z.string().trim().max(40).optional(),
  page: z.number().int().min(1).max(200).optional(),
  page_size: z.number().int().min(1).max(100).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.filters?.price_min !== undefined && value.filters?.price_max !== undefined) {
    if (value.filters.price_min > value.filters.price_max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "price_min must be <= price_max" });
    }
  }

  const hasQuery = Boolean(value.query_text_raw && value.query_text_raw.length > 0);
  const hasFilters = Boolean(value.filters && Object.keys(value.filters).length > 0);
  if (!hasQuery && !hasFilters) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "query or filters required" });
  }
});

const SearchResultReturnedPayloadSchema = z.object({
  search_id: IdSchema,
  results_count: z.number().int().min(0).max(10000),
  has_results: z.boolean(),
  result_ids_sample: z.array(IdSchema).max(20).optional(),
  execution_ms: z.number().int().min(0).max(30000).optional(),
  engine: z.string().trim().max(64).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.has_results !== (value.results_count > 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "has_results must match results_count" });
  }

  if (!value.has_results && (value.result_ids_sample?.length ?? 0) > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "result_ids_sample must be empty when has_results=false" });
  }
});

const PresenceHeartbeatPayloadSchema = z.object({
  presence_subject: PresenceSubject,
  subject_id: IdSchema,
  session_id: IdSchema,
  status: PresenceStatus,
  last_seen_at: IsoDateTimeUtc,
  device_type: DeviceType.optional(),
  app_surface: AppSurface.optional(),
}).strict();

const PlatformVisitPayloadSchema = z.object({
  provider_event_id: z.string().trim().min(1).max(256),
  metric_name: MetricName,
  metric_value: z.number().positive(),
  page_path: z.string().trim().max(512).optional(),
  route: z.string().trim().max(512).optional(),
  referrer_host: z.string().trim().max(255).optional(),
  country: z.string().trim().regex(/^[A-Z]{2}$/).optional(),
  device_category: DeviceType.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.page_path && !value.page_path.startsWith("/")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "page_path must start with '/'" });
  }
});
```

## 4.5 Event-specific validation switch

```ts
function validateEventPayload(envelope: z.infer<typeof EventEnvelopeSchema>) {
  switch (envelope.event_name) {
    case "search_performed":
      SearchPerformedPayloadSchema.parse(envelope.payload);
      break;
    case "search_result_returned":
      SearchResultReturnedPayloadSchema.parse(envelope.payload);
      break;
    case "user_presence_heartbeat":
      PresenceHeartbeatPayloadSchema.parse(envelope.payload);
      break;
    case "platform_visit":
      PlatformVisitPayloadSchema.parse(envelope.payload);
      break;
  }
}
```

## 4.6 Ingestion request schema

```ts
const IngestionHeadersSchema = z.object({
  "content-type": z.string().includes("application/json"),
  "x-correlation-id": IdSchema,
  "idempotency-key": IdSchema,
  "x-analytics-source": z.enum(["firebase", "vercel", "location-maison"]),
}).strict();

const IngestionBodySchema = z.object({
  batch_id: IdSchema,
  sent_at: IsoDateTimeUtc,
  events: z.array(EventEnvelopeSchema).min(1).max(500),
}).strict();
```

## 4.7 Read endpoint query schemas

```ts
const RangeSchema = z.enum(["24h", "7d", "30d", "custom"]);

const SearchesQuerySchema = z.object({
  range: RangeSchema.default("7d"),
  source: z.enum(["all", "catalog_search_page", "location_maison_search_bar"]).default("all"),
  start: z.iso.date().optional(),
  end: z.iso.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
}).strict().superRefine((v, ctx) => {
  if (v.range === "custom" && (!v.start || !v.end)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "start and end required when range=custom" });
  }
});

const TrafficQuerySchema = z.object({
  range: RangeSchema.default("7d"),
  provider: z.enum(["all", "firebase", "vercel"]).default("all"),
  start: z.iso.date().optional(),
  end: z.iso.date().optional(),
}).strict();

const PresenceCursorQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().trim().min(1).optional(),
}).strict();
```

## 5. Acceptance criteria mapping

- ANL-001 done when DDL is applied in `dev` and smoke checks pass.
- ANL-002 done when ingestion endpoint enforces all schemas and returns:
  - `202` accepted/rejected counts
  - `400` validation errors
  - `409` idempotency conflict (same key, different payload)

## 6. Notes for implementation

- BigQuery PK constraints are `NOT ENFORCED`: dedupe still required in ingestion logic.
- Keep `require_partition_filter=TRUE` to avoid expensive full scans.
- Enforce UTC timestamps at API edge.
- For Vercel metrics, this spec assumes ingestion from controlled exports/adapters; direct public dashboard scraping is out of scope.
