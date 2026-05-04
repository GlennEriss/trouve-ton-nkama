import { randomUUID } from "node:crypto";

import { getFirebaseAdminApp } from "@/lib/firebase/firebase-admin";

const BIGQUERY_API_BASE = "https://bigquery.googleapis.com/bigquery/v2";
const DEFAULT_DEV_DATASET = "admin_analytics_dev";
const DEFAULT_PROD_DATASET = "admin_analytics_prod";

type BigQueryInsertRow = {
  insertId: string;
  json: Record<string, unknown>;
};

type BigQueryRequestMethod = "POST";

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

function resolveRuntimeDataset() {
  if (process.env.BQ_DATASET?.trim()) {
    return process.env.BQ_DATASET.trim();
  }

  const env = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (env === "prod" || env === "production") {
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
  body: Record<string, unknown>,
): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${BIGQUERY_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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

export async function upsertIdempotencyRegistryRow(
  row: IdempotencyRegistryRow,
) {
  await insertRows(
    "ingestion_idempotency_registry",
    toInsertRows([row], () => row.idempotency_key),
  );
}
