import {
  getBigQueryRuntimeContext,
  runBigQueryQuery,
  type BigQueryQueryParam,
} from "@/modules/analytics-insights/infrastructure/analytics-bigquery.repository";

export type TrafficAnalyticsRange = "24h" | "7d" | "30d" | "custom";
export type TrafficProviderFilter = "all" | "firebase" | "vercel";

export type TrafficAnalyticsListInput = {
  range?: TrafficAnalyticsRange;
  start?: string;
  end?: string;
  provider?: TrafficProviderFilter;
  limit?: number;
  offset?: number;
  topPagesLimit?: number;
};

type DateWindow = {
  range: TrafficAnalyticsRange;
  startAt: string;
  endAt: string;
};

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveDateWindow(input: TrafficAnalyticsListInput): DateWindow {
  const now = new Date();
  const range = input.range ?? "7d";

  if (range === "custom") {
    const start = input.start ? new Date(input.start) : null;
    const end = input.end ? new Date(input.end) : null;

    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("RANGE_CUSTOM_REQUIRES_VALID_START_END");
    }

    if (start.getTime() >= end.getTime()) {
      throw new Error("RANGE_CUSTOM_START_AFTER_END");
    }

    return {
      range,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    };
  }

  const start = new Date(now.getTime());
  if (range === "24h") {
    start.setHours(start.getHours() - 24);
  } else if (range === "30d") {
    start.setDate(start.getDate() - 30);
  } else {
    start.setDate(start.getDate() - 7);
  }

  return {
    range,
    startAt: start.toISOString(),
    endAt: now.toISOString(),
  };
}

function getTrafficTableRef() {
  const runtime = getBigQueryRuntimeContext();
  return `\`${runtime.projectId}.${runtime.datasetId}.traffic_events_raw\``;
}

function buildBaseQuery() {
  return `
WITH events_in_range AS (
  SELECT
    CASE
      WHEN source = "firebase_analytics" THEN "firebase"
      WHEN source = "vercel_analytics" THEN "vercel"
      ELSE source
    END AS provider,
    metric_name,
    metric_value,
    page_path,
    route,
    referrer_host,
    country,
    device_category,
    occurred_at,
    correlation_id
  FROM ${getTrafficTableRef()}
  WHERE occurred_at >= TIMESTAMP(@startAt)
    AND occurred_at < TIMESTAMP(@endAt)
    AND source IN ("firebase_analytics", "vercel_analytics")
),
filtered AS (
  SELECT *
  FROM events_in_range
  WHERE @provider = "all" OR provider = @provider
)
`;
}

function buildBaseParameters(input: {
  startAt: string;
  endAt: string;
  provider: TrafficProviderFilter;
}): BigQueryQueryParam[] {
  return [
    { name: "startAt", type: "STRING", value: input.startAt },
    { name: "endAt", type: "STRING", value: input.endAt },
    { name: "provider", type: "STRING", value: input.provider },
  ];
}

function mapSummary(row: Record<string, unknown> | undefined) {
  const totalEvents = toSafeNumber(row?.total_events, 0);
  const visits = toSafeNumber(row?.visits, 0);
  const uniqueVisitors = toSafeNumber(row?.unique_visitors, 0);
  const pageViews = toSafeNumber(row?.page_views, 0);

  return {
    totalEvents,
    visits,
    uniqueVisitors,
    pageViews,
  };
}

function mapProviders(rows: Record<string, unknown>[]) {
  return rows
    .map((row) => ({
      provider: toNullableString(row.provider) ?? "unknown",
      totalEvents: toSafeNumber(row.total_events, 0),
      visits: toSafeNumber(row.visits, 0),
      uniqueVisitors: toSafeNumber(row.unique_visitors, 0),
      pageViews: toSafeNumber(row.page_views, 0),
    }))
    .sort((a, b) => b.visits - a.visits);
}

function mapDaily(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    dateKey: toNullableString(row.date_key) ?? "",
    provider: toNullableString(row.provider) ?? "unknown",
    visits: toSafeNumber(row.visits, 0),
    uniqueVisitors: toSafeNumber(row.unique_visitors, 0),
    pageViews: toSafeNumber(row.page_views, 0),
  }));
}

function mapTopPages(rows: Record<string, unknown>[]) {
  return rows
    .map((row) => ({
      page: toNullableString(row.page) ?? "/",
      pageViews: toSafeNumber(row.page_views, 0),
      visits: toSafeNumber(row.visits, 0),
    }))
    .filter((row) => row.pageViews > 0 || row.visits > 0);
}

function mapRecentEvents(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    occurredAt: toNullableString(row.occurred_at) ?? "",
    provider: toNullableString(row.provider) ?? "unknown",
    metricName: toNullableString(row.metric_name) ?? "unknown",
    metricValue: toSafeNumber(row.metric_value, 0),
    pagePath: toNullableString(row.page_path),
    country: toNullableString(row.country),
    deviceCategory: toNullableString(row.device_category),
    correlationId: toNullableString(row.correlation_id),
  }));
}

function mapCompareDaily(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    dateKey: toNullableString(row.date_key) ?? "",
    firebaseVisits: toSafeNumber(row.firebase_visits, 0),
    vercelVisits: toSafeNumber(row.vercel_visits, 0),
    deltaVisits: toSafeNumber(row.delta_visits, 0),
    deltaPercent: row.delta_percent === null ? null : toSafeNumber(row.delta_percent, 0),
  }));
}

export async function listTrafficAnalytics(input: TrafficAnalyticsListInput) {
  const window = resolveDateWindow(input);
  const provider = input.provider ?? "all";
  const limit = Math.max(1, Math.min(200, input.limit ?? 50));
  const offset = Math.max(0, input.offset ?? 0);
  const topPagesLimit = Math.max(1, Math.min(30, input.topPagesLimit ?? 10));
  const baseSql = buildBaseQuery();
  const baseParams = buildBaseParameters({
    startAt: window.startAt,
    endAt: window.endAt,
    provider,
  });

  const [summaryResult, providersResult, dailyResult, topPagesResult, recentResult] =
    await Promise.all([
      runBigQueryQuery({
        query: `${baseSql}
SELECT
  COUNT(*) AS total_events,
  SUM(IF(metric_name = "visit", metric_value, 0)) AS visits,
  SUM(IF(metric_name = "unique_visitor", metric_value, 0)) AS unique_visitors,
  SUM(IF(metric_name = "page_view", metric_value, 0)) AS page_views
FROM filtered`,
        parameters: baseParams,
        maxResults: 1,
      }),
      runBigQueryQuery({
        query: `${baseSql}
SELECT
  provider,
  COUNT(*) AS total_events,
  SUM(IF(metric_name = "visit", metric_value, 0)) AS visits,
  SUM(IF(metric_name = "unique_visitor", metric_value, 0)) AS unique_visitors,
  SUM(IF(metric_name = "page_view", metric_value, 0)) AS page_views
FROM filtered
GROUP BY provider
ORDER BY visits DESC, provider ASC`,
        parameters: baseParams,
        maxResults: 10,
      }),
      runBigQueryQuery({
        query: `${baseSql}
SELECT
  FORMAT_DATE('%Y-%m-%d', DATE(occurred_at)) AS date_key,
  provider,
  SUM(IF(metric_name = "visit", metric_value, 0)) AS visits,
  SUM(IF(metric_name = "unique_visitor", metric_value, 0)) AS unique_visitors,
  SUM(IF(metric_name = "page_view", metric_value, 0)) AS page_views
FROM filtered
GROUP BY date_key, provider
ORDER BY date_key DESC, provider ASC`,
        parameters: baseParams,
        maxResults: 200,
      }),
      runBigQueryQuery({
        query: `${baseSql}
SELECT
  COALESCE(NULLIF(route, ""), NULLIF(page_path, ""), "/") AS page,
  SUM(IF(metric_name = "page_view", metric_value, 0)) AS page_views,
  SUM(IF(metric_name = "visit", metric_value, 0)) AS visits
FROM filtered
GROUP BY page
HAVING page_views > 0 OR visits > 0
ORDER BY page_views DESC, visits DESC, page ASC
LIMIT @topLimit`,
        parameters: [...baseParams, { name: "topLimit", type: "INT64", value: topPagesLimit }],
        maxResults: topPagesLimit,
      }),
      runBigQueryQuery({
        query: `${baseSql}
SELECT
  FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E3SZ', occurred_at) AS occurred_at,
  provider,
  metric_name,
  metric_value,
  COALESCE(NULLIF(route, ""), NULLIF(page_path, "")) AS page_path,
  country,
  device_category,
  correlation_id
FROM filtered
ORDER BY occurred_at DESC
LIMIT @limit
OFFSET @offset`,
        parameters: [
          ...baseParams,
          { name: "limit", type: "INT64", value: limit },
          { name: "offset", type: "INT64", value: offset },
        ],
        maxResults: limit,
      }),
    ]);

  const summary = mapSummary(summaryResult.rows[0]);
  const recentEvents = mapRecentEvents(recentResult.rows);

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    filters: {
      provider,
    },
    summary,
    providers: mapProviders(providersResult.rows),
    daily: mapDaily(dailyResult.rows),
    topPages: mapTopPages(topPagesResult.rows),
    events: recentEvents,
    page: {
      limit,
      offset,
      returned: recentEvents.length,
      totalCount: summary.totalEvents,
      hasMore: offset + recentEvents.length < summary.totalEvents,
      nextOffset:
        offset + recentEvents.length < summary.totalEvents
          ? offset + recentEvents.length
          : null,
    },
  };
}

export async function getTrafficComparison(
  input: Omit<TrafficAnalyticsListInput, "provider" | "limit" | "offset" | "topPagesLimit">,
) {
  const window = resolveDateWindow(input);
  const table = getTrafficTableRef();
  const baseParams: BigQueryQueryParam[] = [
    { name: "startAt", type: "STRING", value: window.startAt },
    { name: "endAt", type: "STRING", value: window.endAt },
  ];

  const [totalsResult, dailyResult] = await Promise.all([
    runBigQueryQuery({
      query: `
WITH filtered AS (
  SELECT
    CASE
      WHEN source = "firebase_analytics" THEN "firebase"
      WHEN source = "vercel_analytics" THEN "vercel"
      ELSE source
    END AS provider,
    metric_name,
    metric_value
  FROM ${table}
  WHERE occurred_at >= TIMESTAMP(@startAt)
    AND occurred_at < TIMESTAMP(@endAt)
    AND source IN ("firebase_analytics", "vercel_analytics")
)
SELECT
  SUM(IF(provider = "firebase" AND metric_name = "visit", metric_value, 0)) AS firebase_visits,
  SUM(IF(provider = "vercel" AND metric_name = "visit", metric_value, 0)) AS vercel_visits
FROM filtered`,
      parameters: baseParams,
      maxResults: 1,
    }),
    runBigQueryQuery({
      query: `
WITH filtered AS (
  SELECT
    FORMAT_DATE('%Y-%m-%d', DATE(occurred_at)) AS date_key,
    CASE
      WHEN source = "firebase_analytics" THEN "firebase"
      WHEN source = "vercel_analytics" THEN "vercel"
      ELSE source
    END AS provider,
    metric_name,
    metric_value
  FROM ${table}
  WHERE occurred_at >= TIMESTAMP(@startAt)
    AND occurred_at < TIMESTAMP(@endAt)
    AND source IN ("firebase_analytics", "vercel_analytics")
),
daily_provider AS (
  SELECT
    date_key,
    provider,
    SUM(IF(metric_name = "visit", metric_value, 0)) AS visits
  FROM filtered
  GROUP BY date_key, provider
),
pivoted AS (
  SELECT
    date_key,
    SUM(IF(provider = "firebase", visits, 0)) AS firebase_visits,
    SUM(IF(provider = "vercel", visits, 0)) AS vercel_visits
  FROM daily_provider
  GROUP BY date_key
)
SELECT
  date_key,
  firebase_visits,
  vercel_visits,
  (vercel_visits - firebase_visits) AS delta_visits,
  IF(firebase_visits = 0, NULL, ROUND(((vercel_visits - firebase_visits) / firebase_visits) * 100, 2)) AS delta_percent
FROM pivoted
ORDER BY date_key DESC`,
      parameters: baseParams,
      maxResults: 200,
    }),
  ]);

  const totalsRow = totalsResult.rows[0];
  const firebaseVisits = toSafeNumber(totalsRow?.firebase_visits, 0);
  const vercelVisits = toSafeNumber(totalsRow?.vercel_visits, 0);
  const deltaVisits = vercelVisits - firebaseVisits;
  const deltaPercent =
    firebaseVisits > 0 ? Number(((deltaVisits / firebaseVisits) * 100).toFixed(2)) : null;

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    summary: {
      firebaseVisits,
      vercelVisits,
      deltaVisits,
      deltaPercent,
    },
    daily: mapCompareDaily(dailyResult.rows),
  };
}
