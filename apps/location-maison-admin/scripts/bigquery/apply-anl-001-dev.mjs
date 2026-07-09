#!/usr/bin/env node

import { GoogleAuth } from "google-auth-library";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!filePath) {
    return;
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Env file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const envFileArgIndex = process.argv.findIndex((arg) => arg === "--env-file");
if (envFileArgIndex >= 0) {
  const envFilePath = process.argv[envFileArgIndex + 1];
  if (!envFilePath) {
    throw new Error("Missing value for --env-file");
  }
  loadEnvFile(envFilePath);
}

function readJsonFile(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Service account file not found: ${absolutePath}`);
  }
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw);
}

function findDefaultServiceAccountFile() {
  const defaultDir = path.resolve(process.cwd(), "services-account-firebase");
  if (!fs.existsSync(defaultDir)) {
    return null;
  }

  const files = fs
    .readdirSync(defaultDir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    return null;
  }

  if (files.length === 1) {
    return path.join(defaultDir, files[0]);
  }

  console.warn(
    `Multiple service account files found in ${defaultDir}. Using first alphabetically: ${files[0]}`,
  );
  return path.join(defaultDir, files[0]);
}

function resolveCredentialSource() {
  const serviceAccountArgIndex = process.argv.findIndex((arg) => arg === "--service-account-file");
  const serviceAccountArgPath =
    serviceAccountArgIndex >= 0 ? process.argv[serviceAccountArgIndex + 1] : undefined;

  if (serviceAccountArgIndex >= 0 && !serviceAccountArgPath) {
    throw new Error("Missing value for --service-account-file");
  }

  const explicitServiceAccountFile =
    serviceAccountArgPath ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE;

  if (explicitServiceAccountFile) {
    const json = readJsonFile(explicitServiceAccountFile);
    return {
      source: "service_account_file",
      credentials: {
        client_email: json.client_email,
        private_key: json.private_key,
      },
    };
  }

  const defaultServiceAccountFile = findDefaultServiceAccountFile();
  if (defaultServiceAccountFile) {
    const json = readJsonFile(defaultServiceAccountFile);
    return {
      source: "service_account_file_default",
      credentials: {
        client_email: json.client_email,
        private_key: json.private_key,
      },
    };
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, "\n") : undefined;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing service account credentials. Provide FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY or use --service-account-file.",
    );
  }

  return {
    source: "env",
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  };
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.GCP_PROJECT_ID;

const datasetId = process.env.BQ_DATASET || "admin_analytics_dev";
const location = process.env.BQ_LOCATION || "EU";

const credentialSource = resolveCredentialSource();
const clientEmail = credentialSource.credentials.client_email;
const privateKey = credentialSource.credentials.private_key;

if (!projectId) {
  throw new Error("Missing project id. Set FIREBASE_PROJECT_ID or GCP_PROJECT_ID.");
}
if (!clientEmail || !privateKey) {
  throw new Error("Missing service account client_email/private_key.");
}

const auth = new GoogleAuth({
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
  scopes: ["https://www.googleapis.com/auth/bigquery", "https://www.googleapis.com/auth/cloud-platform"],
});

function tableRef(name) {
  return `\`${projectId}.${datasetId}.${name}\``;
}

async function getToken() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token || !token.token) {
    throw new Error("Unable to obtain Google access token.");
  }
  return token.token;
}

async function bqRequest(method, path, body) {
  const token = await getToken();
  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `BigQuery API request failed (${response.status})`;
    const details = payload?.error?.errors ? JSON.stringify(payload.error.errors) : "";
    throw new Error(`${message}${details ? ` | details: ${details}` : ""}`);
  }

  return payload;
}

async function ensureDataset() {
  const datasetPath = `/projects/${projectId}/datasets/${datasetId}`;

  try {
    await bqRequest("GET", datasetPath);
    console.log(`Dataset exists: ${projectId}.${datasetId}`);
    return;
  } catch (error) {
    if (!String(error.message).toLowerCase().includes("not found")) {
      throw error;
    }
  }

  await bqRequest("POST", `/projects/${projectId}/datasets`, {
    datasetReference: {
      projectId,
      datasetId,
    },
    location,
    description: "Admin analytics dataset - Trouve Ton Nkama",
  });

  console.log(`Dataset created: ${projectId}.${datasetId} (${location})`);
}

async function runQuery(query, label) {
  const result = await bqRequest("POST", `/projects/${projectId}/queries`, {
    query,
    useLegacySql: false,
    location,
    timeoutMs: 180000,
  });

  if (Array.isArray(result.errors) && result.errors.length > 0) {
    const errors = JSON.stringify(result.errors);
    throw new Error(`BigQuery query errors for ${label}: ${errors}`);
  }

  console.log(`OK: ${label}`);
  return result;
}

function parseRows(result) {
  const fields = result?.schema?.fields || [];
  const rows = result?.rows || [];
  return rows.map((row) => {
    const values = row.f || [];
    const obj = {};
    for (let i = 0; i < fields.length; i += 1) {
      obj[fields[i].name] = values[i]?.v ?? null;
    }
    return obj;
  });
}

const ddlStatements = [
  `CREATE TABLE IF NOT EXISTS ${tableRef("analytics_events_raw")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Canonical raw analytics events")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("analytics_events_rejections")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Rejected analytics events for debugging")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("search_events")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Search lifecycle projection (performed + returned)")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("presence_events")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Presence heartbeat projection")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("traffic_events_raw")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Unified traffic events from Firebase/Vercel")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("search_metrics_daily")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Daily search KPIs")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("presence_snapshots_5min")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Presence snapshots each 5 minutes")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("traffic_metrics_daily")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Daily traffic KPIs by provider")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("traffic_comparison_daily")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Daily Firebase vs Vercel comparison")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("adsense_reporting_raw")} (
    report_date DATE NOT NULL,
    account_id STRING,
    dimension_page_url STRING,
    dimension_ad_unit STRING,
    dimension_country STRING,
    dimension_device STRING,
    estimated_earnings NUMERIC,
    page_views INT64,
    ad_requests INT64,
    matched_ad_requests INT64,
    total_impressions INT64,
    clicks INT64,
    page_views_rpm NUMERIC,
    impressions_rpm NUMERIC,
    active_view_viewability NUMERIC,
    active_view_measurability NUMERIC,
    loaded_at TIMESTAMP NOT NULL
  )
  PARTITION BY report_date
  CLUSTER BY dimension_ad_unit, dimension_country, dimension_device
  OPTIONS (require_partition_filter = TRUE, description = "Raw AdSense reporting export")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("ads_slot_events")} (
    event_id STRING NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    date_key DATE NOT NULL,
    session_id STRING,
    page_path STRING,
    page_template STRING,
    slot_id STRING,
    slot_position STRING,
    event_name STRING NOT NULL,
    latency_ms INT64,
    is_authenticated BOOL,
    country STRING,
    device_category STRING,
    PRIMARY KEY (event_id) NOT ENFORCED
  )
  PARTITION BY date_key
  CLUSTER BY slot_id, event_name, page_template
  OPTIONS (require_partition_filter = TRUE, description = "Slot-level ad integration observability events")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("ads_metrics_daily")} (
    date_key DATE NOT NULL,
    page_template STRING,
    slot_id STRING,
    device_category STRING,
    country STRING,
    estimated_earnings NUMERIC,
    page_views INT64,
    sessions INT64,
    ad_requests INT64,
    matched_ad_requests INT64,
    total_impressions INT64,
    clicks INT64,
    fill_rate NUMERIC,
    ctr NUMERIC,
    page_views_rpm NUMERIC,
    impressions_rpm NUMERIC,
    active_view_viewability NUMERIC,
    updated_at TIMESTAMP NOT NULL
  )
  PARTITION BY date_key
  CLUSTER BY page_template, slot_id, device_category
  OPTIONS (require_partition_filter = TRUE, description = "Daily monetization metrics for dashboard")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("ads_revenue_vs_traffic_daily")} (
    date_key DATE NOT NULL,
    estimated_earnings NUMERIC,
    sessions INT64,
    page_views INT64,
    revenue_per_1k_sessions NUMERIC,
    page_views_rpm NUMERIC,
    delta_revenue_vs_prev_day NUMERIC,
    delta_rpm_vs_prev_day NUMERIC
  )
  PARTITION BY date_key
  OPTIONS (require_partition_filter = TRUE, description = "Revenue vs traffic daily comparison")`,

  `CREATE TABLE IF NOT EXISTS ${tableRef("ingestion_idempotency_registry")} (
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
  OPTIONS (require_partition_filter = TRUE, description = "Idempotency registry (audit/support)")`,
];

async function main() {
  console.log(`ANL-001 setup start | project=${projectId} dataset=${datasetId} location=${location}`);
  console.log(`Auth source: ${credentialSource.source} | service account: ${clientEmail}`);

  await ensureDataset();

  for (let i = 0; i < ddlStatements.length; i += 1) {
    await runQuery(ddlStatements[i], `DDL ${i + 1}/${ddlStatements.length}`);
  }

  const tablesResult = await runQuery(
    `SELECT table_name
     FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.TABLES\`
     ORDER BY table_name`,
    "Smoke check: list tables",
  );

  const tableNames = parseRows(tablesResult).map((r) => r.table_name);
  console.log(`Created/verified tables (${tableNames.length}):`);
  for (const name of tableNames) {
    console.log(` - ${name}`);
  }

  const tableOptionsResult = await runQuery(
    `SELECT
      table_name,
      option_name,
      option_value
    FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.TABLE_OPTIONS\`
    WHERE table_name IN (
      'analytics_events_raw',
      'search_events',
      'presence_events',
      'traffic_events_raw',
      'search_metrics_daily',
      'presence_snapshots_5min',
      'traffic_metrics_daily',
      'traffic_comparison_daily',
      'adsense_reporting_raw',
      'ads_slot_events',
      'ads_metrics_daily',
      'ads_revenue_vs_traffic_daily'
    )
      AND option_name IN ('partitioning_type', 'partitioning_field', 'require_partition_filter')
    ORDER BY table_name, option_name`,
    "Smoke check: table options (partitioning/require_partition_filter)",
  );

  const clusteringResult = await runQuery(
    `SELECT
      table_name,
      clustering_ordinal_position,
      column_name
    FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name IN (
      'analytics_events_raw',
      'search_events',
      'presence_events',
      'traffic_events_raw',
      'search_metrics_daily',
      'presence_snapshots_5min',
      'traffic_metrics_daily',
      'traffic_comparison_daily',
      'adsense_reporting_raw',
      'ads_slot_events',
      'ads_metrics_daily',
      'ads_revenue_vs_traffic_daily'
    )
      AND clustering_ordinal_position IS NOT NULL
    ORDER BY table_name, clustering_ordinal_position`,
    "Smoke check: clustering columns",
  );

  const tableOptionRows = parseRows(tableOptionsResult);
  const clusteringRows = parseRows(clusteringResult);
  console.log(`Table options rows returned: ${tableOptionRows.length}`);
  console.log(`Clustering rows returned: ${clusteringRows.length}`);

  console.log("ANL-001 setup completed successfully.");
}

main().catch((error) => {
  console.error("ANL-001 setup failed:");
  console.error(error.message);
  process.exit(1);
});
