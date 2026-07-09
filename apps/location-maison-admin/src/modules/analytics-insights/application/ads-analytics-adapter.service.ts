import { randomUUID } from "node:crypto";

import type {
  AdSenseAnalyticsAdapterBody,
  AdsSlotEventsAdapterBody,
} from "@/modules/analytics-insights/domain/ads-analytics-adapter.schema";
import {
  getBigQueryRuntimeContext,
  insertAdSenseReportingRawRows,
  insertAdsSlotEventRows,
  runBigQueryQuery,
  type AdSenseReportingRawRow,
  type AdsSlotEventRow,
  type BigQueryQueryParam,
} from "@/modules/analytics-insights/infrastructure/analytics-bigquery.repository";

type DateRange = {
  startDate: string;
  endDate: string;
};

function tableRef(tableName: string) {
  const runtime = getBigQueryRuntimeContext();
  return `\`${runtime.projectId}.${runtime.datasetId}.${tableName}\``;
}

function resolveEnvironmentDateTime(value?: string) {
  if (value) {
    return value;
  }
  return new Date().toISOString();
}

function minDate(values: string[]) {
  return values.reduce((acc, current) => (current < acc ? current : acc), values[0]);
}

function maxDate(values: string[]) {
  return values.reduce((acc, current) => (current > acc ? current : acc), values[0]);
}

function inferPageTemplateFromPath(path: string | null) {
  const normalized = path?.toLowerCase() ?? "";

  if (normalized.startsWith("/search-with-ia")) {
    return "search_with_ia";
  }
  if (normalized.startsWith("/search")) {
    return "catalog_search";
  }
  if (normalized.startsWith("/property")) {
    return "property_detail";
  }
  if (normalized === "/") {
    return "home";
  }
  if (normalized.startsWith("/announcer")) {
    return "announcer_space";
  }
  return "other";
}

function extractPath(urlOrPath: string | null) {
  if (!urlOrPath) {
    return "/";
  }

  const trimmed = urlOrPath.trim();
  if (!trimmed) {
    return "/";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.pathname || "/";
  } catch {
    return "/";
  }
}

export function buildAdSenseRows(input: AdSenseAnalyticsAdapterBody) {
  const loadedAt = resolveEnvironmentDateTime(input.sent_at);

  const rows: AdSenseReportingRawRow[] = input.report_rows.map((row) => ({
    report_date: row.report_date,
    account_id: input.account_id ?? null,
    dimension_page_url: row.dimension_page_url ?? null,
    dimension_ad_unit: row.dimension_ad_unit ?? null,
    dimension_country: row.dimension_country ?? null,
    dimension_device: row.dimension_device ?? null,
    estimated_earnings: row.estimated_earnings,
    page_views: row.page_views,
    ad_requests: row.ad_requests,
    matched_ad_requests: row.matched_ad_requests,
    total_impressions: row.total_impressions,
    clicks: row.clicks,
    page_views_rpm: row.page_views_rpm ?? null,
    impressions_rpm: row.impressions_rpm ?? null,
    active_view_viewability: row.active_view_viewability ?? null,
    active_view_measurability: row.active_view_measurability ?? null,
    loaded_at: row.loaded_at ?? loadedAt,
  }));

  const reportDates = rows.map((row) => row.report_date);
  const range: DateRange = {
    startDate: minDate(reportDates),
    endDate: maxDate(reportDates),
  };

  return {
    rows,
    range,
  };
}

export function buildAdsSlotEventRows(input: AdsSlotEventsAdapterBody) {
  const batchOccurredAt = resolveEnvironmentDateTime(input.occurred_at);
  const sourceFallbackPath =
    input.source === "search_with_ia_page"
      ? "/search-with-ia"
      : input.source === "catalog_search_page"
        ? "/search"
        : "/";

  const rows: AdsSlotEventRow[] = input.events.map((event) => {
    const occurredAt = event.occurred_at ?? batchOccurredAt;
    const pagePath = event.page_path ?? sourceFallbackPath;
    const normalizedPath = extractPath(pagePath);
    return {
      event_id: event.event_id ?? `evt_ads_slot_${randomUUID()}`,
      occurred_at: occurredAt,
      date_key: occurredAt.slice(0, 10),
      session_id: input.session?.session_id ?? null,
      page_path: normalizedPath,
      page_template: event.page_template ?? inferPageTemplateFromPath(normalizedPath),
      slot_id: event.slot_id,
      slot_position: event.slot_position ?? null,
      event_name: event.event_name,
      latency_ms: event.latency_ms ?? null,
      is_authenticated: input.actor?.is_authenticated ?? null,
      country: event.country ?? null,
      device_category: event.device_category ?? null,
    };
  });

  return rows;
}

function buildDateRangeParams(range: DateRange): BigQueryQueryParam[] {
  return [
    { name: "startDate", type: "STRING", value: range.startDate },
    { name: "endDate", type: "STRING", value: range.endDate },
  ];
}

async function refreshAdsMetricsDaily(range: DateRange) {
  await runBigQueryQuery({
    query: `
MERGE ${tableRef("ads_metrics_daily")} AS target
USING (
  WITH base AS (
    SELECT
      report_date AS date_key,
      COALESCE(
        NULLIF(REGEXP_EXTRACT(dimension_page_url, r'https?://[^/]+(/[^?#]*)'), ''),
        NULLIF(REGEXP_EXTRACT(dimension_page_url, r'^(/[^?#]*)'), ''),
        '/'
      ) AS page_path,
      COALESCE(NULLIF(dimension_ad_unit, ''), 'slot_unknown') AS slot_id,
      COALESCE(NULLIF(UPPER(TRIM(dimension_country)), ''), 'NA') AS country,
      CASE
        WHEN LOWER(COALESCE(dimension_device, '')) LIKE '%mobile%' THEN 'mobile'
        WHEN LOWER(COALESCE(dimension_device, '')) LIKE '%tablet%' THEN 'tablet'
        WHEN LOWER(COALESCE(dimension_device, '')) LIKE '%desktop%' THEN 'desktop'
        ELSE 'unknown'
      END AS device_category,
      CAST(estimated_earnings AS FLOAT64) AS estimated_earnings,
      page_views,
      ad_requests,
      matched_ad_requests,
      total_impressions,
      clicks,
      CAST(active_view_viewability AS FLOAT64) AS active_view_viewability,
      loaded_at
    FROM ${tableRef("adsense_reporting_raw")}
    WHERE report_date >= DATE(@startDate)
      AND report_date <= DATE(@endDate)
  )
  SELECT
    date_key,
    CASE
      WHEN page_path = '/' THEN 'home'
      WHEN STARTS_WITH(page_path, '/search-with-ia') THEN 'search_with_ia'
      WHEN STARTS_WITH(page_path, '/search') THEN 'catalog_search'
      WHEN STARTS_WITH(page_path, '/property') THEN 'property_detail'
      WHEN STARTS_WITH(page_path, '/announcer') THEN 'announcer_space'
      ELSE 'other'
    END AS page_template,
    slot_id,
    device_category,
    country,
    CAST(SUM(estimated_earnings) AS NUMERIC) AS estimated_earnings,
    SUM(page_views) AS page_views,
    0 AS sessions,
    SUM(ad_requests) AS ad_requests,
    SUM(matched_ad_requests) AS matched_ad_requests,
    SUM(total_impressions) AS total_impressions,
    SUM(clicks) AS clicks,
    CAST(SAFE_DIVIDE(SUM(matched_ad_requests), NULLIF(SUM(ad_requests), 0)) AS NUMERIC) AS fill_rate,
    CAST(SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(total_impressions), 0)) AS NUMERIC) AS ctr,
    CAST(SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(page_views), 0)) AS NUMERIC) AS page_views_rpm,
    CAST(SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(total_impressions), 0)) AS NUMERIC) AS impressions_rpm,
    CAST(
      SAFE_DIVIDE(
        SUM(COALESCE(active_view_viewability, 0) * COALESCE(total_impressions, 0)),
        NULLIF(SUM(total_impressions), 0)
      ) AS NUMERIC
    ) AS active_view_viewability,
    MAX(loaded_at) AS updated_at
  FROM base
  GROUP BY date_key, page_template, slot_id, device_category, country
) AS source
ON target.date_key = source.date_key
  AND target.page_template = source.page_template
  AND target.slot_id = source.slot_id
  AND target.device_category = source.device_category
  AND target.country = source.country
WHEN MATCHED THEN
  UPDATE SET
    estimated_earnings = source.estimated_earnings,
    page_views = source.page_views,
    sessions = source.sessions,
    ad_requests = source.ad_requests,
    matched_ad_requests = source.matched_ad_requests,
    total_impressions = source.total_impressions,
    clicks = source.clicks,
    fill_rate = source.fill_rate,
    ctr = source.ctr,
    page_views_rpm = source.page_views_rpm,
    impressions_rpm = source.impressions_rpm,
    active_view_viewability = source.active_view_viewability,
    updated_at = source.updated_at
WHEN NOT MATCHED THEN
  INSERT (
    date_key,
    page_template,
    slot_id,
    device_category,
    country,
    estimated_earnings,
    page_views,
    sessions,
    ad_requests,
    matched_ad_requests,
    total_impressions,
    clicks,
    fill_rate,
    ctr,
    page_views_rpm,
    impressions_rpm,
    active_view_viewability,
    updated_at
  )
  VALUES (
    source.date_key,
    source.page_template,
    source.slot_id,
    source.device_category,
    source.country,
    source.estimated_earnings,
    source.page_views,
    source.sessions,
    source.ad_requests,
    source.matched_ad_requests,
    source.total_impressions,
    source.clicks,
    source.fill_rate,
    source.ctr,
    source.page_views_rpm,
    source.impressions_rpm,
    source.active_view_viewability,
    source.updated_at
  )`,
    parameters: buildDateRangeParams(range),
    timeoutMs: 180000,
  });
}

async function refreshAdsRevenueVsTrafficDaily(range: DateRange) {
  await runBigQueryQuery({
    query: `
MERGE ${tableRef("ads_revenue_vs_traffic_daily")} AS target
USING (
  WITH ads_daily AS (
    SELECT
      date_key,
      CAST(SUM(estimated_earnings) AS NUMERIC) AS estimated_earnings,
      SUM(page_views) AS page_views,
      CAST(SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(page_views), 0)) AS NUMERIC) AS page_views_rpm
    FROM ${tableRef("ads_metrics_daily")}
    WHERE date_key >= DATE(@startDate)
      AND date_key <= DATE(@endDate)
    GROUP BY date_key
  ),
  traffic_daily AS (
    SELECT
      DATE(occurred_at) AS date_key,
      CAST(SUM(IF(metric_name = 'visit', metric_value, 0)) AS INT64) AS sessions
    FROM ${tableRef("traffic_events_raw")}
    WHERE occurred_at >= TIMESTAMP(@startDate)
      AND occurred_at < TIMESTAMP(DATE_ADD(DATE(@endDate), INTERVAL 1 DAY))
    GROUP BY date_key
  )
  SELECT
    ads_daily.date_key AS date_key,
    ads_daily.estimated_earnings AS estimated_earnings,
    CAST(COALESCE(traffic_daily.sessions, 0) AS INT64) AS sessions,
    ads_daily.page_views AS page_views,
    CAST(
      SAFE_DIVIDE(ads_daily.estimated_earnings * 1000, NULLIF(COALESCE(traffic_daily.sessions, 0), 0))
      AS NUMERIC
    ) AS revenue_per_1k_sessions,
    ads_daily.page_views_rpm AS page_views_rpm
  FROM ads_daily
  LEFT JOIN traffic_daily
    ON ads_daily.date_key = traffic_daily.date_key
) AS source
ON target.date_key = source.date_key
WHEN MATCHED THEN
  UPDATE SET
    estimated_earnings = source.estimated_earnings,
    sessions = source.sessions,
    page_views = source.page_views,
    revenue_per_1k_sessions = source.revenue_per_1k_sessions,
    page_views_rpm = source.page_views_rpm,
    delta_revenue_vs_prev_day = NULL,
    delta_rpm_vs_prev_day = NULL
WHEN NOT MATCHED THEN
  INSERT (
    date_key,
    estimated_earnings,
    sessions,
    page_views,
    revenue_per_1k_sessions,
    page_views_rpm,
    delta_revenue_vs_prev_day,
    delta_rpm_vs_prev_day
  )
  VALUES (
    source.date_key,
    source.estimated_earnings,
    source.sessions,
    source.page_views,
    source.revenue_per_1k_sessions,
    source.page_views_rpm,
    NULL,
    NULL
  )`,
    parameters: buildDateRangeParams(range),
    timeoutMs: 180000,
  });
}

export async function ingestAdSenseReportRows(input: AdSenseAnalyticsAdapterBody) {
  const built = buildAdSenseRows(input);
  await insertAdSenseReportingRawRows(built.rows);
  await refreshAdsMetricsDaily(built.range);
  await refreshAdsRevenueVsTrafficDaily(built.range);

  return {
    insertedRows: built.rows.length,
    refreshedRange: built.range,
  };
}

export async function ingestAdsSlotEvents(input: AdsSlotEventsAdapterBody) {
  const rows = buildAdsSlotEventRows(input);
  await insertAdsSlotEventRows(rows);

  return {
    insertedRows: rows.length,
  };
}
