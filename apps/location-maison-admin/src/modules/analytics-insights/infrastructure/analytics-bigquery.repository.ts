import { randomUUID } from "node:crypto";

import { getFirebaseAdminApp } from "@/lib/firebase/firebase-admin";

const BIGQUERY_API_BASE = "https://bigquery.googleapis.com/bigquery/v2";
const DEFAULT_DEV_DATASET = "admin_analytics_dev";
const DEFAULT_PROD_DATASET = "admin_analytics_prod";

type BigQueryInsertRow = {
  insertId: string;
  json: Record<string, unknown>;
};

type BigQueryRequestMethod = "GET" | "POST";

type BigQueryInsertError = {
  index?: number;
  errors?: Array<{
    reason?: string;
    message?: string;
    location?: string;
  }>;
};

type BigQueryInsertResponse = {
  insertErrors?: BigQueryInsertError[];
};

type BigQueryQueryResponseField = {
  name: string;
  type: string;
};

type BigQueryQueryResponseRow = {
  f: Array<{
    v: unknown;
  }>;
};

type BigQueryQueryResponse = {
  jobComplete?: boolean;
  schema?: {
    fields?: BigQueryQueryResponseField[];
  };
  rows?: BigQueryQueryResponseRow[];
  totalRows?: string;
  jobReference?: {
    jobId?: string;
    location?: string;
  };
  errors?: Array<{
    reason?: string;
    message?: string;
  }>;
};

export type BigQueryQueryParamType = "STRING" | "INT64" | "FLOAT64" | "BOOL";

export type BigQueryQueryParam = {
  name: string;
  type: BigQueryQueryParamType;
  value: string | number | boolean;
};

export type BigQueryQueryResultRow = Record<string, unknown>;

export type RawAnalyticsEventRow = {
  event_id: string;
  event_name: string;
  schema_version: string;
  occurred_at: string;
  received_at: string;
  source: string;
  environment: string;
  correlation_id: string;
  actor_type: string | null;
  actor_id: string | null;
  is_authenticated: boolean | null;
  session_id: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
  payload_json: Record<string, unknown>;
  ingestion_status: "accepted" | "rejected" | "quarantined";
  ingestion_error_code: string | null;
  ingestion_error_message: string | null;
  batch_id: string;
  idempotency_key: string;
  payload_fingerprint: string;
  ingested_by: string;
};

export type RejectedAnalyticsEventRow = {
  rejection_id: string;
  event_id: string | null;
  event_name: string | null;
  source: string | null;
  environment: string | null;
  rejection_reason_code: string;
  rejection_reason_message: string;
  validation_issues_json: Array<{
    path: Array<string | number>;
    message: string;
  }>;
  raw_event_json: Record<string, unknown>;
  batch_id: string;
  idempotency_key: string;
  correlation_id: string;
  rejected_at: string;
};

export type SearchProjectionRow = {
  search_id: string;
  search_performed_event_id: string | null;
  search_result_event_id: string | null;
  source: string;
  occurred_at: string;
  query_text_raw: string | null;
  query_text_normalized: string | null;
  filters_json: Record<string, unknown> | null;
  page: number | null;
  page_size: number | null;
  results_count: number | null;
  has_results: boolean | null;
  result_ids_sample_json: string[] | null;
  execution_ms: number | null;
  engine: string | null;
  actor_id: string | null;
  is_authenticated: boolean | null;
  session_id: string | null;
  correlation_id: string;
};

export type PresenceProjectionRow = {
  event_id: string;
  presence_subject: string;
  subject_id: string;
  session_id: string;
  status: string;
  last_seen_at: string;
  device_type: string | null;
  app_surface: string | null;
  source: string;
  occurred_at: string;
  correlation_id: string;
};

export type TrafficProjectionRow = {
  source: string;
  provider_event_id: string;
  metric_name: string;
  metric_value: number;
  page_path: string | null;
  route: string | null;
  referrer_host: string | null;
  country: string | null;
  device_category: string | null;
  occurred_at: string;
  correlation_id: string;
};

export type IdempotencyRegistryRow = {
  idempotency_key: string;
  request_fingerprint: string;
  first_seen_at: string;
  last_seen_at: string;
  request_status: "pending" | "completed" | "failed";
  correlation_id: string;
};

export type AdSenseReportingRawRow = {
  report_date: string;
  account_id: string | null;
  dimension_page_url: string | null;
  dimension_ad_unit: string | null;
  dimension_country: string | null;
  dimension_device: string | null;
  estimated_earnings: number;
  page_views: number;
  ad_requests: number;
  matched_ad_requests: number;
  total_impressions: number;
  clicks: number;
  page_views_rpm: number | null;
  impressions_rpm: number | null;
  active_view_viewability: number | null;
  active_view_measurability: number | null;
  loaded_at: string;
};

export type AdsSlotEventRow = {
  event_id: string;
  occurred_at: string;
  date_key: string;
  session_id: string | null;
  page_path: string | null;
  page_template: string | null;
  slot_id: string | null;
  slot_position: string | null;
  event_name: string;
  latency_ms: number | null;
  is_authenticated: boolean | null;
  country: string | null;
  device_category: string | null;
};

function resolveRuntimeDataset() {
  if (process.env.BQ_DATASET?.trim()) {
    return process.env.BQ_DATASET.trim();
  }

  const env = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (env === "prod" || env === "production") {
    return DEFAULT_PROD_DATASET;
  }

  // Safety fallback: infer dataset from project id when env flags are missing.
  const projectIdHint = (
    process.env.GCP_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    ""
  )
    .trim()
    .toLowerCase();

  if (projectIdHint.includes("prod")) {
    return DEFAULT_PROD_DATASET;
  }

  return DEFAULT_DEV_DATASET;
}

function resolveRuntimeProjectId() {
  const projectId =
    process.env.GCP_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      "Missing GCP project id for BigQuery runtime. Set GCP_PROJECT_ID or FIREBASE_PROJECT_ID.",
    );
  }

  return projectId;
}

function resolveRuntimeLocation() {
  const location = process.env.BQ_LOCATION?.trim();
  if (location) {
    return location;
  }
  return "EU";
}

export function getBigQueryRuntimeContext() {
  return {
    projectId: resolveRuntimeProjectId(),
    datasetId: resolveRuntimeDataset(),
    location: resolveRuntimeLocation(),
  };
}

function stripUndefined(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        output[key] = stripUndefined(item);
      }
    }
    return output;
  }

  return value;
}

function normalizeRowForBigQuery(row: Record<string, unknown>) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) {
      output[key] = null;
      continue;
    }

    if (key.endsWith("_json")) {
      if (value === null) {
        output[key] = null;
      } else if (typeof value === "string") {
        output[key] = value;
      } else {
        output[key] = JSON.stringify(value);
      }
      continue;
    }

    output[key] = stripUndefined(value);
  }

  return output;
}

async function getAccessToken() {
  const app = getFirebaseAdminApp();
  const credential = app.options.credential as
    | {
        getAccessToken?: () => Promise<{ access_token?: string }>;
      }
    | undefined;

  if (!credential?.getAccessToken) {
    throw new Error("Firebase credential cannot issue access tokens for BigQuery.");
  }

  const tokenPayload = await credential.getAccessToken();
  const token = tokenPayload.access_token;

  if (!token) {
    throw new Error("Unable to resolve BigQuery OAuth access token.");
  }

  return token;
}

async function bigQueryRequest<T>(
  method: BigQueryRequestMethod,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${BIGQUERY_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  const payload = rawText.length > 0 ? (JSON.parse(rawText) as Record<string, unknown>) : {};

  if (!response.ok) {
    const message =
      (payload.error as { message?: string } | undefined)?.message ||
      payload.message ||
      `BigQuery request failed (${response.status})`;
    throw new Error(String(message));
  }

  return payload as T;
}

function parseTimestampString(value: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return value;
  }

  return new Date(numeric * 1000).toISOString();
}

function parseBigQueryScalar(value: unknown, type: string): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  switch (type) {
    case "INTEGER":
    case "INT64": {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case "FLOAT":
    case "FLOAT64":
    case "NUMERIC":
    case "BIGNUMERIC": {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case "BOOLEAN":
    case "BOOL":
      return String(value).toLowerCase() === "true";
    case "TIMESTAMP":
      return typeof value === "string" ? parseTimestampString(value) : String(value);
    default:
      return value;
  }
}

function parseBigQueryQueryRows(response: BigQueryQueryResponse): BigQueryQueryResultRow[] {
  const fields = response.schema?.fields ?? [];
  const rows = response.rows ?? [];

  return rows.map((row) => {
    const mapped: Record<string, unknown> = {};

    fields.forEach((field, index) => {
      const rawValue = row.f[index]?.v ?? null;
      mapped[field.name] = parseBigQueryScalar(rawValue, field.type);
    });

    return mapped;
  });
}

function buildQueryParameters(parameters: BigQueryQueryParam[]) {
  return parameters.map((parameter) => ({
    name: parameter.name,
    parameterType: {
      type: parameter.type,
    },
    parameterValue: {
      value: String(parameter.value),
    },
  }));
}

async function waitForQueryResult(
  projectId: string,
  queryResult: BigQueryQueryResponse,
  maxResults: number | undefined,
): Promise<BigQueryQueryResponse> {
  if (queryResult.jobComplete) {
    return queryResult;
  }

  const jobId = queryResult.jobReference?.jobId;
  const location = queryResult.jobReference?.location ?? resolveRuntimeLocation();

  if (!jobId) {
    throw new Error("BigQuery query did not return a job id.");
  }

  const params = new URLSearchParams({
    location,
    timeoutMs: String(180000),
  });

  if (maxResults !== undefined) {
    params.set("maxResults", String(maxResults));
  }

  return bigQueryRequest<BigQueryQueryResponse>(
    "GET",
    `/projects/${encodeURIComponent(projectId)}/queries/${encodeURIComponent(jobId)}?${params.toString()}`,
  );
}

export async function runBigQueryQuery(input: {
  query: string;
  parameters?: BigQueryQueryParam[];
  maxResults?: number;
  timeoutMs?: number;
}) {
  const projectId = resolveRuntimeProjectId();
  const location = resolveRuntimeLocation();
  const parameters = input.parameters ?? [];

  const response = await bigQueryRequest<BigQueryQueryResponse>(
    "POST",
    `/projects/${encodeURIComponent(projectId)}/queries`,
    {
      query: input.query,
      useLegacySql: false,
      location,
      timeoutMs: input.timeoutMs ?? 120000,
      maxResults: input.maxResults,
      parameterMode: parameters.length > 0 ? "NAMED" : undefined,
      queryParameters: parameters.length > 0 ? buildQueryParameters(parameters) : undefined,
    },
  );

  const completedResponse = await waitForQueryResult(projectId, response, input.maxResults);

  if (Array.isArray(completedResponse.errors) && completedResponse.errors.length > 0) {
    const first = completedResponse.errors[0];
    throw new Error(
      first.message ??
        `BigQuery query failed: ${first.reason ?? "UNKNOWN_REASON"}`,
    );
  }

  return {
    rows: parseBigQueryQueryRows(completedResponse),
    totalRows:
      typeof completedResponse.totalRows === "string"
        ? Number(completedResponse.totalRows)
        : null,
  };
}

function toInsertRows<T extends Record<string, unknown>>(
  rows: T[],
  createInsertId: (row: T, index: number) => string,
): BigQueryInsertRow[] {
  return rows.map((row, index) => ({
    insertId: createInsertId(row, index),
    json: normalizeRowForBigQuery(row),
  }));
}

async function insertRows(
  tableId: string,
  rows: BigQueryInsertRow[],
) {
  if (rows.length === 0) {
    return;
  }

  const projectId = resolveRuntimeProjectId();
  const datasetId = resolveRuntimeDataset();

  const result = await bigQueryRequest<BigQueryInsertResponse>(
    "POST",
    `/projects/${encodeURIComponent(projectId)}/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}/insertAll`,
    {
      skipInvalidRows: true,
      ignoreUnknownValues: false,
      rows,
      traceId: randomUUID().slice(0, 36),
    },
  );

  if (Array.isArray(result.insertErrors) && result.insertErrors.length > 0) {
    const first = result.insertErrors[0];
    const firstMessage = first.errors?.[0]?.message ?? "Unknown BigQuery insert error";
    throw new Error(
      `BigQuery insert error on ${tableId}: row_index=${first.index ?? -1} message=${firstMessage}`,
    );
  }
}

export async function insertRawAnalyticsEvents(rows: RawAnalyticsEventRow[]) {
  await insertRows(
    "analytics_events_raw",
    toInsertRows(rows, (row) => row.event_id),
  );
}

export async function insertRejectedAnalyticsEvents(rows: RejectedAnalyticsEventRow[]) {
  await insertRows(
    "analytics_events_rejections",
    toInsertRows(rows, (row) => row.rejection_id),
  );
}

export async function insertSearchProjectionRows(rows: SearchProjectionRow[]) {
  await insertRows(
    "search_events",
    toInsertRows(rows, (row, index) => `${row.search_id}:${row.correlation_id}:${index}`),
  );
}

export async function insertPresenceProjectionRows(rows: PresenceProjectionRow[]) {
  await insertRows(
    "presence_events",
    toInsertRows(rows, (row) => row.event_id),
  );
}

export async function insertTrafficProjectionRows(rows: TrafficProjectionRow[]) {
  await insertRows(
    "traffic_events_raw",
    toInsertRows(rows, (row) => `${row.source}:${row.provider_event_id}`),
  );
}

export async function insertAdSenseReportingRawRows(rows: AdSenseReportingRawRow[]) {
  await insertRows(
    "adsense_reporting_raw",
    toInsertRows(
      rows,
      (row) =>
        [
          row.report_date,
          row.account_id ?? "na",
          row.dimension_page_url ?? "na",
          row.dimension_ad_unit ?? "na",
          row.dimension_country ?? "na",
          row.dimension_device ?? "na",
        ].join(":"),
    ),
  );
}

export async function insertAdsSlotEventRows(rows: AdsSlotEventRow[]) {
  await insertRows(
    "ads_slot_events",
    toInsertRows(rows, (row) => row.event_id),
  );
}

export async function upsertIdempotencyRegistryRow(
  row: IdempotencyRegistryRow,
) {
  await insertRows(
    "ingestion_idempotency_registry",
    toInsertRows([row], () => row.idempotency_key),
  );
}
