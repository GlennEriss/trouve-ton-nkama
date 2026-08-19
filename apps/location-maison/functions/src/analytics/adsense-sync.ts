import { randomUUID } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import '../node/slow-buffer-compat';
import * as functions from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { adminDB } from "../admin";

type GoogleOAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type AdSenseReportHeader = {
  name?: string;
  type?: string;
};

type AdSenseReportCell = {
  value?: string;
};

type AdSenseReportRow = {
  cells?: AdSenseReportCell[];
};

type AdSenseReportResponse = {
  headers?: AdSenseReportHeader[];
  rows?: AdSenseReportRow[];
  warnings?: string[];
};

type NormalizedAdSenseReportRow = {
  report_date: string;
  dimension_page_url?: string;
  dimension_ad_unit?: string;
  dimension_country?: string;
  dimension_device?: string;
  estimated_earnings: number;
  page_views: number;
  ad_requests: number;
  matched_ad_requests: number;
  total_impressions: number;
  clicks: number;
  page_views_rpm?: number;
  impressions_rpm?: number;
  active_view_viewability?: number;
  active_view_measurability?: number;
};

type DateRange = {
  startDate: string;
  endDate: string;
};

const DEFAULT_SCHEDULE = "15 2 * * *";
const DEFAULT_TIME_ZONE = "Africa/Libreville";
const DEFAULT_LOOKBACK_DAYS = 1;
// Plafond imposé par l'API AdSense v2 sur `limit` : au-delà, reports:generate répond
// « 400 Request contains an invalid argument » (mesuré le 2026-08-18 : 100000 -> 200,
// 100001 -> 400). La valeur précédente, 250000, faisait échouer TOUTES les synchronisations
// depuis le 2026-05-07 — 102 exécutions, aucune réussie.
const ADSENSE_MAX_REPORT_ROWS_LIMIT = 100000;
const DEFAULT_MAX_REPORT_ROWS = ADSENSE_MAX_REPORT_ROWS_LIMIT;
const DEFAULT_DIMENSIONS = [
  "DATE",
  "PAGE_URL",
  "AD_UNIT_NAME",
  "COUNTRY_CODE",
  "PLATFORM_TYPE_NAME",
];
const DEFAULT_METRICS = [
  "ESTIMATED_EARNINGS",
  "PAGE_VIEWS",
  "AD_REQUESTS",
  "MATCHED_AD_REQUESTS",
  "IMPRESSIONS",
  "CLICKS",
  "PAGE_VIEWS_RPM",
  "IMPRESSIONS_RPM",
  "ACTIVE_VIEW_VIEWABILITY",
  "ACTIVE_VIEW_MEASURABILITY",
];

const ADSENSE_SYNC_COLLECTION =
  process.env.ADSENSE_SYNC_COLLECTION?.trim() || "admin_adsense_sync_runs";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function resolveDateRangeFromNow(now: Date, lookbackDays: number): DateRange {
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - Math.max(0, lookbackDays - 1));

  return {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
  };
}

function splitCsvConfig(value: string | undefined, fallback: string[]) {
  if (!value?.trim()) {
    return fallback;
  }

  const parts = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return parts.length > 0 ? parts : fallback;
}

function sanitizeUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveEnvironment() {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (explicit === "prod" || explicit === "production") {
    return "prod";
  }
  if (explicit === "preprod" || explicit === "staging") {
    return "preprod";
  }

  const projectHint =
    process.env.GCLOUD_PROJECT?.toLowerCase() ||
    process.env.GCP_PROJECT?.toLowerCase() ||
    process.env.FIREBASE_PROJECT_ID?.toLowerCase() ||
    "";

  if (projectHint.includes("prod")) {
    return "prod";
  }
  if (projectHint.includes("preprod") || projectHint.includes("staging")) {
    return "preprod";
  }

  return "dev";
}

function requireConfigValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`MISSING_CONFIG_${name}`);
  }
  return value;
}

function toDateParts(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map((entry) => Number.parseInt(entry, 10));
  return { year, month, day };
}

function toSafeNumber(value: string | undefined) {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractHeaderIndexMap(headers: AdSenseReportHeader[] | undefined) {
  const map = new Map<string, number>();
  (headers ?? []).forEach((header, index) => {
    const name = header.name?.trim().toUpperCase();
    if (name) {
      map.set(name, index);
    }
  });
  return map;
}

function readCell(row: AdSenseReportRow, index: number | undefined) {
  if (index === undefined || index < 0) {
    return undefined;
  }
  const value = row.cells?.[index]?.value;
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeReportRows(payload: AdSenseReportResponse): NormalizedAdSenseReportRow[] {
  const headers = extractHeaderIndexMap(payload.headers);
  const rows = payload.rows ?? [];
  const normalized: NormalizedAdSenseReportRow[] = [];

  for (const row of rows) {
    const reportDate = readCell(row, headers.get("DATE"));
    if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      continue;
    }

    normalized.push({
      report_date: reportDate,
      dimension_page_url: readCell(row, headers.get("PAGE_URL")),
      dimension_ad_unit: readCell(row, headers.get("AD_UNIT_NAME")),
      dimension_country: readCell(row, headers.get("COUNTRY_CODE")),
      dimension_device: readCell(row, headers.get("PLATFORM_TYPE_NAME")),
      estimated_earnings: toSafeNumber(readCell(row, headers.get("ESTIMATED_EARNINGS"))),
      page_views: Math.round(toSafeNumber(readCell(row, headers.get("PAGE_VIEWS")))),
      ad_requests: Math.round(toSafeNumber(readCell(row, headers.get("AD_REQUESTS")))),
      matched_ad_requests: Math.round(
        toSafeNumber(readCell(row, headers.get("MATCHED_AD_REQUESTS"))),
      ),
      total_impressions: Math.round(toSafeNumber(readCell(row, headers.get("IMPRESSIONS")))),
      clicks: Math.round(toSafeNumber(readCell(row, headers.get("CLICKS")))),
      page_views_rpm: toSafeNumber(readCell(row, headers.get("PAGE_VIEWS_RPM"))),
      impressions_rpm: toSafeNumber(readCell(row, headers.get("IMPRESSIONS_RPM"))),
      active_view_viewability: toSafeNumber(
        readCell(row, headers.get("ACTIVE_VIEW_VIEWABILITY")),
      ),
      active_view_measurability: toSafeNumber(
        readCell(row, headers.get("ACTIVE_VIEW_MEASURABILITY")),
      ),
    });
  }

  return normalized;
}

async function fetchGoogleAccessToken() {
  const clientId = requireConfigValue("ADSENSE_OAUTH_CLIENT_ID");
  const clientSecret = requireConfigValue("ADSENSE_OAUTH_CLIENT_SECRET");
  const refreshToken = requireConfigValue("ADSENSE_OAUTH_REFRESH_TOKEN");

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("refresh_token", refreshToken);
  body.set("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = (await response.json().catch(() => null)) as GoogleOAuthTokenResponse | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      `ADSENSE_OAUTH_TOKEN_FAILED:${response.status}:${
        payload?.error_description || payload?.error || "unknown"
      }`,
    );
  }

  return payload.access_token;
}

async function fetchAdSenseReport(input: {
  accessToken: string;
  accountResource: string;
  dateRange: DateRange;
}) {
  const dimensions = splitCsvConfig(process.env.ADSENSE_SYNC_DIMENSIONS, DEFAULT_DIMENSIONS);
  const metrics = splitCsvConfig(process.env.ADSENSE_SYNC_METRICS, DEFAULT_METRICS);
  // Borné au plafond de l'API : une valeur trop haute dans ADSENSE_SYNC_MAX_ROWS ne doit plus
  // pouvoir casser la synchronisation en silence.
  const maxRows = Math.min(
    parsePositiveInt(process.env.ADSENSE_SYNC_MAX_ROWS, DEFAULT_MAX_REPORT_ROWS),
    ADSENSE_MAX_REPORT_ROWS_LIMIT,
  );
  const reportingTimeZone =
    process.env.ADSENSE_SYNC_REPORTING_TIME_ZONE?.trim() || "ACCOUNT_TIME_ZONE";
  const currencyCode = process.env.ADSENSE_SYNC_CURRENCY_CODE?.trim();

  if (!input.accountResource.startsWith("accounts/")) {
    throw new Error("ADSENSE_ACCOUNT_RESOURCE_INVALID");
  }

  const url = new URL(`https://adsense.googleapis.com/v2/${input.accountResource}/reports:generate`);
  for (const dimension of dimensions) {
    url.searchParams.append("dimensions", dimension);
  }
  for (const metric of metrics) {
    url.searchParams.append("metrics", metric);
  }

  const start = toDateParts(input.dateRange.startDate);
  const end = toDateParts(input.dateRange.endDate);

  url.searchParams.set("startDate.year", String(start.year));
  url.searchParams.set("startDate.month", String(start.month));
  url.searchParams.set("startDate.day", String(start.day));
  url.searchParams.set("endDate.year", String(end.year));
  url.searchParams.set("endDate.month", String(end.month));
  url.searchParams.set("endDate.day", String(end.day));
  url.searchParams.set("limit", String(maxRows));
  url.searchParams.set("reportingTimeZone", reportingTimeZone);
  if (currencyCode) {
    url.searchParams.set("currencyCode", currencyCode);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as AdSenseReportResponse | {
    error?: { message?: string };
  } | null;

  if (!response.ok || !payload || !("headers" in payload)) {
    const message =
      payload && "error" in payload && payload.error?.message
        ? payload.error.message
        : "Report generation failed";
    throw new Error(`ADSENSE_REPORT_FETCH_FAILED:${response.status}:${message}`);
  }

  return payload;
}

function makeRunKey(range: DateRange) {
  return `adsense:${range.startDate}:${range.endDate}`;
}

async function claimRun(runKey: string, correlationId: string, scheduleTime: string | null) {
  const ref = adminDB.collection(ADSENSE_SYNC_COLLECTION).doc(runKey);
  const status = await adminDB.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { status?: string } | undefined;
    const previousStatus = data?.status;

    if (previousStatus === "completed") {
      tx.set(
        ref,
        {
          lastSkipAt: FieldValue.serverTimestamp(),
          lastCorrelationId: correlationId,
          skipReason: "already_completed",
        },
        { merge: true },
      );
      return "already_completed" as const;
    }

    tx.set(
      ref,
      {
        runKey,
        status: "running",
        attempts: FieldValue.increment(1),
        lastCorrelationId: correlationId,
        scheduleTime: scheduleTime ?? null,
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return "claimed" as const;
  });

  return { status, ref };
}

async function markRunCompleted(input: {
  runKey: string;
  rowsCount: number;
  refreshedRange: DateRange;
  adapterStatus: number;
  correlationId: string;
  warningCount: number;
}) {
  await adminDB
    .collection(ADSENSE_SYNC_COLLECTION)
    .doc(input.runKey)
    .set(
      {
        status: "completed",
        rowsCount: input.rowsCount,
        refreshedRange: input.refreshedRange,
        adapterStatus: input.adapterStatus,
        warningCount: input.warningCount,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastCorrelationId: input.correlationId,
        lastError: null,
      },
      { merge: true },
    );
}

async function markRunFailed(input: {
  runKey: string;
  correlationId: string;
  error: unknown;
}) {
  const message = input.error instanceof Error ? input.error.message : "UNKNOWN_ERROR";
  const stack = input.error instanceof Error ? input.error.stack?.slice(0, 4000) ?? null : null;

  await adminDB
    .collection(ADSENSE_SYNC_COLLECTION)
    .doc(input.runKey)
    .set(
      {
        status: "failed",
        failedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastCorrelationId: input.correlationId,
        lastError: {
          message,
          stack,
        },
      },
      { merge: true },
    );
}

async function pushRowsToAdminAdapter(input: {
  dateRange: DateRange;
  rows: NormalizedAdSenseReportRow[];
  correlationId: string;
}) {
  const adapterUrl = sanitizeUrl(
    process.env.ADSENSE_SYNC_TARGET_URL || process.env.ANALYTICS_ADSENSE_ADAPTER_URL,
  );
  const ingestToken = process.env.ANALYTICS_INGEST_TOKEN?.trim();

  if (!adapterUrl) {
    throw new Error("MISSING_CONFIG_ADSENSE_SYNC_TARGET_URL");
  }
  if (!ingestToken) {
    throw new Error("MISSING_CONFIG_ANALYTICS_INGEST_TOKEN");
  }

  const payload = {
    sent_at: new Date().toISOString(),
    environment: resolveEnvironment(),
    account_id: requireConfigValue("ADSENSE_ACCOUNT_RESOURCE"),
    report_rows: input.rows,
    batch_id: `batch_adsense_sync_${input.dateRange.startDate}_${input.dateRange.endDate}`,
    correlation_id: input.correlationId,
  };

  const response = await fetch(adapterUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ingestToken}`,
      "X-Correlation-Id": input.correlationId,
      "Idempotency-Key": `adsense_sync_${input.dateRange.startDate}_${input.dateRange.endDate}`,
      "X-Analytics-Source": "location-maison",
    },
    body: JSON.stringify(payload),
  });

  const responsePayload = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: { message?: string } }
    | null;

  if (!response.ok || responsePayload?.success === false) {
    throw new Error(
      `ADSENSE_ADAPTER_PUSH_FAILED:${response.status}:${
        responsePayload?.error?.message || "unknown"
      }`,
    );
  }

  return {
    status: response.status,
  };
}

export const syncAdSenseToAdminAnalytics = onSchedule(
  {
    schedule: process.env.ADSENSE_SYNC_SCHEDULE?.trim() || DEFAULT_SCHEDULE,
    timeZone: process.env.ADSENSE_SYNC_TIMEZONE?.trim() || DEFAULT_TIME_ZONE,
    timeoutSeconds: 540,
    memory: "512MiB",
    retryCount: 1,
  },
  async (event) => {
    const enabled = parseBoolean(process.env.ADSENSE_SYNC_ENABLED, true);
    if (!enabled) {
      functions.logger.info("AdSense sync disabled (ADSENSE_SYNC_ENABLED=false).");
      return;
    }

    const correlationId = `corr_adsense_sync_${randomUUID()}`;
    const lookbackDays = parsePositiveInt(process.env.ADSENSE_SYNC_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS);
    const range = resolveDateRangeFromNow(new Date(), lookbackDays);
    const runKey = makeRunKey(range);

    const claimed = await claimRun(runKey, correlationId, event.scheduleTime ?? null);
    if (claimed.status === "already_completed") {
      functions.logger.info("AdSense sync skipped (already completed).", {
        runKey,
        correlationId,
      });
      return;
    }

    try {
      const accessToken = await fetchGoogleAccessToken();
      const accountResource = requireConfigValue("ADSENSE_ACCOUNT_RESOURCE");
      const reportPayload = await fetchAdSenseReport({
        accessToken,
        accountResource,
        dateRange: range,
      });

      const normalizedRows = normalizeReportRows(reportPayload);

      if (normalizedRows.length === 0) {
        functions.logger.warn("AdSense sync produced no rows.", {
          runKey,
          correlationId,
          warnings: reportPayload.warnings ?? [],
        });
      } else {
        await pushRowsToAdminAdapter({
          dateRange: range,
          rows: normalizedRows,
          correlationId,
        });
      }

      await markRunCompleted({
        runKey,
        rowsCount: normalizedRows.length,
        refreshedRange: range,
        adapterStatus: normalizedRows.length > 0 ? 202 : 204,
        correlationId,
        warningCount: reportPayload.warnings?.length ?? 0,
      });

      functions.logger.info("AdSense sync completed.", {
        runKey,
        correlationId,
        rowsCount: normalizedRows.length,
        range,
      });
    } catch (error) {
      await markRunFailed({
        runKey,
        correlationId,
        error,
      });

      functions.logger.error("AdSense sync failed.", {
        runKey,
        correlationId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  },
);
