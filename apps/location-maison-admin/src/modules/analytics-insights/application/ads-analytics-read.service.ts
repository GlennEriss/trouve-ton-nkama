import {
  getBigQueryRuntimeContext,
  runBigQueryQuery,
  type BigQueryQueryParam,
} from "@/modules/analytics-insights/infrastructure/analytics-bigquery.repository";

export type AdsAnalyticsRange = "24h" | "7d" | "30d" | "custom";

export type AdsAnalyticsBaseInput = {
  range?: AdsAnalyticsRange;
  start?: string;
  end?: string;
};

type DateWindow = {
  range: AdsAnalyticsRange;
  startAt: string;
  endAt: string;
  startDate: string;
  endDate: string;
};

type AdsTablesAvailability = {
  adsMetricsDaily: boolean;
  adsenseReportingRaw: boolean;
  adsSlotEvents: boolean;
  adsRevenueVsTrafficDaily: boolean;
};

export type AdsAnalyticsOverview = {
  period: {
    range: AdsAnalyticsRange;
    startAt: string;
    endAt: string;
  };
  summary: {
    revenueToday: number;
    revenue7d: number;
    revenue30d: number;
    revenueMtd: number;
    periodRevenue: number;
    periodPageViews: number;
    periodSessions: number;
    pageViewsRpm: number | null;
    impressionsRpm: number | null;
    revenuePer1kSessions: number | null;
    fillRate: number | null;
    ctr: number | null;
    viewability: number | null;
    latestUpdatedAt: string | null;
  };
  dataAvailability: AdsTablesAvailability;
};

export type AdsRevenueTimeseriesPoint = {
  dateKey: string;
  estimatedEarnings: number;
  pageViews: number;
  sessions: number;
  revenuePer1kSessions: number | null;
  pageViewsRpm: number | null;
  ctr: number | null;
  fillRate: number | null;
  viewability: number | null;
};

export type AdsRevenueTimeseries = {
  period: {
    range: AdsAnalyticsRange;
    startAt: string;
    endAt: string;
  };
  points: AdsRevenueTimeseriesPoint[];
};

export type AdsPlacementsInput = AdsAnalyticsBaseInput & {
  limit?: number;
  offset?: number;
};

export type AdsPlacementRow = {
  slotId: string;
  pageTemplate: string;
  estimatedEarnings: number;
  adRequests: number;
  matchedAdRequests: number;
  fillRate: number | null;
  totalImpressions: number;
  clicks: number;
  ctr: number | null;
  pageViewsRpm: number | null;
  viewability: number | null;
};

export type AdsPlacementsResult = {
  period: {
    range: AdsAnalyticsRange;
    startAt: string;
    endAt: string;
  };
  rows: AdsPlacementRow[];
  page: {
    limit: number;
    offset: number;
    returned: number;
    totalCount: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
  source: "ads_metrics_daily" | "ads_slot_events" | "none";
};

export type AdsPagesInput = AdsAnalyticsBaseInput & {
  limit?: number;
  offset?: number;
};

export type AdsPageRow = {
  pageKey: string;
  estimatedEarnings: number;
  pageViews: number;
  adRequests: number;
  matchedAdRequests: number;
  totalImpressions: number;
  clicks: number;
  pageViewsRpm: number | null;
  impressionsRpm: number | null;
  ctr: number | null;
  fillRate: number | null;
};

export type AdsPagesResult = {
  period: {
    range: AdsAnalyticsRange;
    startAt: string;
    endAt: string;
  };
  rows: AdsPageRow[];
  page: {
    limit: number;
    offset: number;
    returned: number;
    totalCount: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
  source: "adsense_reporting_raw" | "ads_metrics_daily" | "none";
};

export type AdsAlertLevel = "info" | "warning" | "critical";

export type AdsAlert = {
  id: string;
  level: AdsAlertLevel;
  title: string;
  message: string;
  metric: string;
  value: number | null;
  threshold: number | null;
  dateKey: string | null;
};

export type AdsAlertsResult = {
  period: {
    range: AdsAnalyticsRange;
    startAt: string;
    endAt: string;
  };
  generatedAt: string;
  alerts: AdsAlert[];
};

export type AdsPeriodComparisonKey = "J-1" | "7j" | "30j" | "MTD";

export type AdsPeriodComparisonRow = {
  key: AdsPeriodComparisonKey;
  label: string;
  currentStartDate: string;
  currentEndDate: string;
  previousStartDate: string;
  previousEndDate: string;
  currentRevenue: number;
  previousRevenue: number;
  revenueDelta: number;
  revenueDeltaPercent: number | null;
  currentFillRate: number | null;
  previousFillRate: number | null;
  fillRateDeltaPercent: number | null;
  currentCtr: number | null;
  previousCtr: number | null;
  ctrDeltaPercent: number | null;
  currentPageViewsRpm: number | null;
  previousPageViewsRpm: number | null;
  pageViewsRpmDeltaPercent: number | null;
};

export type AdsPeriodComparisonsResult = {
  generatedAt: string;
  rows: AdsPeriodComparisonRow[];
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

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = toSafeNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toDateKey(isoDate: string) {
  return isoDate.slice(0, 10);
}

function getAdsMetricsDailyTableRef() {
  const runtime = getBigQueryRuntimeContext();
  return `\`${runtime.projectId}.${runtime.datasetId}.ads_metrics_daily\``;
}

function getAdSenseReportingRawTableRef() {
  const runtime = getBigQueryRuntimeContext();
  return `\`${runtime.projectId}.${runtime.datasetId}.adsense_reporting_raw\``;
}

function getInfoSchemaTableRef() {
  const runtime = getBigQueryRuntimeContext();
  return `\`${runtime.projectId}.${runtime.datasetId}.INFORMATION_SCHEMA.TABLES\``;
}

function resolveDateWindow(input: AdsAnalyticsBaseInput): DateWindow {
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
      startDate: toDateKey(start.toISOString()),
      endDate: toDateKey(end.toISOString()),
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
    startDate: toDateKey(start.toISOString()),
    endDate: toDateKey(now.toISOString()),
  };
}

async function getAdsTablesAvailability(): Promise<AdsTablesAvailability> {
  try {
    const result = await runBigQueryQuery({
      query: `
SELECT table_name
FROM ${getInfoSchemaTableRef()}
WHERE table_name IN (
  "ads_metrics_daily",
  "adsense_reporting_raw",
  "ads_slot_events",
  "ads_revenue_vs_traffic_daily"
)`,
      maxResults: 20,
    });

    const names = new Set(
      result.rows
        .map((row) => toNullableString(row.table_name))
        .filter((value): value is string => Boolean(value)),
    );

    return {
      adsMetricsDaily: names.has("ads_metrics_daily"),
      adsenseReportingRaw: names.has("adsense_reporting_raw"),
      adsSlotEvents: names.has("ads_slot_events"),
      adsRevenueVsTrafficDaily: names.has("ads_revenue_vs_traffic_daily"),
    };
  } catch {
    return {
      adsMetricsDaily: false,
      adsenseReportingRaw: false,
      adsSlotEvents: false,
      adsRevenueVsTrafficDaily: false,
    };
  }
}

function getDateParameters(window: DateWindow): BigQueryQueryParam[] {
  return [
    { name: "startDate", type: "STRING", value: window.startDate },
    { name: "endDate", type: "STRING", value: window.endDate },
  ];
}

export async function getAdsAnalyticsOverview(
  input: AdsAnalyticsBaseInput,
): Promise<AdsAnalyticsOverview> {
  const window = resolveDateWindow(input);
  const tables = await getAdsTablesAvailability();

  if (!tables.adsMetricsDaily) {
    return {
      period: {
        range: window.range,
        startAt: window.startAt,
        endAt: window.endAt,
      },
      summary: {
        revenueToday: 0,
        revenue7d: 0,
        revenue30d: 0,
        revenueMtd: 0,
        periodRevenue: 0,
        periodPageViews: 0,
        periodSessions: 0,
        pageViewsRpm: null,
        impressionsRpm: null,
        revenuePer1kSessions: null,
        fillRate: null,
        ctr: null,
        viewability: null,
        latestUpdatedAt: null,
      },
      dataAvailability: tables,
    };
  }

  const result = await runBigQueryQuery({
    query: `
SELECT
  SUM(IF(date_key = CURRENT_DATE("UTC"), estimated_earnings, 0)) AS revenue_today,
  SUM(IF(date_key >= DATE_SUB(CURRENT_DATE("UTC"), INTERVAL 6 DAY), estimated_earnings, 0)) AS revenue_7d,
  SUM(IF(date_key >= DATE_SUB(CURRENT_DATE("UTC"), INTERVAL 29 DAY), estimated_earnings, 0)) AS revenue_30d,
  SUM(IF(date_key >= DATE_TRUNC(CURRENT_DATE("UTC"), MONTH), estimated_earnings, 0)) AS revenue_mtd,
  SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), estimated_earnings, 0)) AS period_revenue,
  SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), page_views, 0)) AS period_page_views,
  SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), sessions, 0)) AS period_sessions,
  SAFE_DIVIDE(
    SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), estimated_earnings, 0)) * 1000,
    NULLIF(SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), page_views, 0)), 0)
  ) AS page_views_rpm,
  SAFE_DIVIDE(
    SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), estimated_earnings, 0)) * 1000,
    NULLIF(SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), total_impressions, 0)), 0)
  ) AS impressions_rpm,
  SAFE_DIVIDE(
    SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), estimated_earnings, 0)) * 1000,
    NULLIF(SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), sessions, 0)), 0)
  ) AS revenue_per_1k_sessions,
  SAFE_DIVIDE(
    SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), matched_ad_requests, 0)),
    NULLIF(SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), ad_requests, 0)), 0)
  ) AS fill_rate,
  SAFE_DIVIDE(
    SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), clicks, 0)),
    NULLIF(SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), total_impressions, 0)), 0)
  ) AS ctr,
  SAFE_DIVIDE(
    SUM(
      IF(
        date_key >= DATE(@startDate)
        AND date_key <= DATE(@endDate),
        COALESCE(active_view_viewability, 0) * COALESCE(total_impressions, 0),
        0
      )
    ),
    NULLIF(SUM(IF(date_key >= DATE(@startDate) AND date_key <= DATE(@endDate), total_impressions, 0)), 0)
  ) AS viewability,
  MAX(updated_at) AS latest_updated_at
FROM ${getAdsMetricsDailyTableRef()}
WHERE date_key >= DATE_SUB(CURRENT_DATE("UTC"), INTERVAL 365 DAY)`,
    parameters: getDateParameters(window),
    maxResults: 1,
  });

  const row = result.rows[0];

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    summary: {
      revenueToday: toSafeNumber(row?.revenue_today, 0),
      revenue7d: toSafeNumber(row?.revenue_7d, 0),
      revenue30d: toSafeNumber(row?.revenue_30d, 0),
      revenueMtd: toSafeNumber(row?.revenue_mtd, 0),
      periodRevenue: toSafeNumber(row?.period_revenue, 0),
      periodPageViews: toSafeNumber(row?.period_page_views, 0),
      periodSessions: toSafeNumber(row?.period_sessions, 0),
      pageViewsRpm: toNullableNumber(row?.page_views_rpm),
      impressionsRpm: toNullableNumber(row?.impressions_rpm),
      revenuePer1kSessions: toNullableNumber(row?.revenue_per_1k_sessions),
      fillRate: toNullableNumber(row?.fill_rate),
      ctr: toNullableNumber(row?.ctr),
      viewability: toNullableNumber(row?.viewability),
      latestUpdatedAt: toNullableString(row?.latest_updated_at),
    },
    dataAvailability: tables,
  };
}

function mapRevenueTimeseriesRows(rows: Record<string, unknown>[]): AdsRevenueTimeseriesPoint[] {
  return rows.map((row) => ({
    dateKey: toNullableString(row.date_key) ?? "",
    estimatedEarnings: toSafeNumber(row.estimated_earnings, 0),
    pageViews: toSafeNumber(row.page_views, 0),
    sessions: toSafeNumber(row.sessions, 0),
    revenuePer1kSessions: toNullableNumber(row.revenue_per_1k_sessions),
    pageViewsRpm: toNullableNumber(row.page_views_rpm),
    ctr: toNullableNumber(row.ctr),
    fillRate: toNullableNumber(row.fill_rate),
    viewability: toNullableNumber(row.viewability),
  }));
}

export async function listAdsRevenueTimeseries(
  input: AdsAnalyticsBaseInput,
): Promise<AdsRevenueTimeseries> {
  const window = resolveDateWindow(input);
  const tables = await getAdsTablesAvailability();

  if (!tables.adsMetricsDaily) {
    return {
      period: {
        range: window.range,
        startAt: window.startAt,
        endAt: window.endAt,
      },
      points: [],
    };
  }

  const result = await runBigQueryQuery({
    query: `
SELECT
  FORMAT_DATE('%Y-%m-%d', date_key) AS date_key,
  SUM(estimated_earnings) AS estimated_earnings,
  SUM(page_views) AS page_views,
  SUM(sessions) AS sessions,
  SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(sessions), 0)) AS revenue_per_1k_sessions,
  SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(page_views), 0)) AS page_views_rpm,
  SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(total_impressions), 0)) AS ctr,
  SAFE_DIVIDE(SUM(matched_ad_requests), NULLIF(SUM(ad_requests), 0)) AS fill_rate,
  SAFE_DIVIDE(
    SUM(COALESCE(active_view_viewability, 0) * COALESCE(total_impressions, 0)),
    NULLIF(SUM(total_impressions), 0)
  ) AS viewability
FROM ${getAdsMetricsDailyTableRef()}
WHERE date_key >= DATE(@startDate)
  AND date_key <= DATE(@endDate)
GROUP BY date_key
ORDER BY date_key DESC`,
    parameters: getDateParameters(window),
    maxResults: 400,
  });

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    points: mapRevenueTimeseriesRows(result.rows),
  };
}

function buildPagination(limit?: number, offset?: number) {
  const resolvedLimit = Math.max(1, Math.min(200, limit ?? 20));
  const resolvedOffset = Math.max(0, offset ?? 0);
  return {
    limit: resolvedLimit,
    offset: resolvedOffset,
  };
}

export async function listAdsPlacements(input: AdsPlacementsInput): Promise<AdsPlacementsResult> {
  const window = resolveDateWindow(input);
  const tables = await getAdsTablesAvailability();
  const { limit, offset } = buildPagination(input.limit, input.offset);

  if (!tables.adsMetricsDaily) {
    return {
      period: {
        range: window.range,
        startAt: window.startAt,
        endAt: window.endAt,
      },
      rows: [],
      page: {
        limit,
        offset,
        returned: 0,
        totalCount: 0,
        hasMore: false,
        nextOffset: null,
      },
      source: "none",
    };
  }

  const [rowsResult, totalCountResult] = await Promise.all([
    runBigQueryQuery({
      query: `
SELECT
  COALESCE(NULLIF(slot_id, ""), "slot_inconnu") AS slot_id,
  COALESCE(NULLIF(page_template, ""), "inconnu") AS page_template,
  SUM(estimated_earnings) AS estimated_earnings,
  SUM(ad_requests) AS ad_requests,
  SUM(matched_ad_requests) AS matched_ad_requests,
  SAFE_DIVIDE(SUM(matched_ad_requests), NULLIF(SUM(ad_requests), 0)) AS fill_rate,
  SUM(total_impressions) AS total_impressions,
  SUM(clicks) AS clicks,
  SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(total_impressions), 0)) AS ctr,
  SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(page_views), 0)) AS page_views_rpm,
  SAFE_DIVIDE(
    SUM(COALESCE(active_view_viewability, 0) * COALESCE(total_impressions, 0)),
    NULLIF(SUM(total_impressions), 0)
  ) AS viewability
FROM ${getAdsMetricsDailyTableRef()}
WHERE date_key >= DATE(@startDate)
  AND date_key <= DATE(@endDate)
GROUP BY slot_id, page_template
ORDER BY estimated_earnings DESC, slot_id ASC, page_template ASC
LIMIT @limit
OFFSET @offset`,
      parameters: [
        ...getDateParameters(window),
        { name: "limit", type: "INT64", value: limit },
        { name: "offset", type: "INT64", value: offset },
      ],
      maxResults: limit,
    }),
    runBigQueryQuery({
      query: `
SELECT COUNT(*) AS total_count
FROM (
  SELECT
    COALESCE(NULLIF(slot_id, ""), "slot_inconnu") AS slot_id,
    COALESCE(NULLIF(page_template, ""), "inconnu") AS page_template
  FROM ${getAdsMetricsDailyTableRef()}
  WHERE date_key >= DATE(@startDate)
    AND date_key <= DATE(@endDate)
  GROUP BY slot_id, page_template
)`,
      parameters: getDateParameters(window),
      maxResults: 1,
    }),
  ]);

  const rows = rowsResult.rows.map((row) => ({
    slotId: toNullableString(row.slot_id) ?? "slot_inconnu",
    pageTemplate: toNullableString(row.page_template) ?? "inconnu",
    estimatedEarnings: toSafeNumber(row.estimated_earnings, 0),
    adRequests: toSafeNumber(row.ad_requests, 0),
    matchedAdRequests: toSafeNumber(row.matched_ad_requests, 0),
    fillRate: toNullableNumber(row.fill_rate),
    totalImpressions: toSafeNumber(row.total_impressions, 0),
    clicks: toSafeNumber(row.clicks, 0),
    ctr: toNullableNumber(row.ctr),
    pageViewsRpm: toNullableNumber(row.page_views_rpm),
    viewability: toNullableNumber(row.viewability),
  }));

  const totalCount = toSafeNumber(totalCountResult.rows[0]?.total_count, 0);

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    rows,
    page: {
      limit,
      offset,
      returned: rows.length,
      totalCount,
      hasMore: offset + rows.length < totalCount,
      nextOffset: offset + rows.length < totalCount ? offset + limit : null,
    },
    source: "ads_metrics_daily",
  };
}

export async function listAdsPages(input: AdsPagesInput): Promise<AdsPagesResult> {
  const window = resolveDateWindow(input);
  const tables = await getAdsTablesAvailability();
  const { limit, offset } = buildPagination(input.limit, input.offset);

  if (tables.adsenseReportingRaw) {
    const [rowsResult, totalCountResult] = await Promise.all([
      runBigQueryQuery({
        query: `
SELECT
  COALESCE(NULLIF(dimension_page_url, ""), "page_inconnue") AS page_key,
  SUM(estimated_earnings) AS estimated_earnings,
  SUM(page_views) AS page_views,
  SUM(ad_requests) AS ad_requests,
  SUM(matched_ad_requests) AS matched_ad_requests,
  SUM(total_impressions) AS total_impressions,
  SUM(clicks) AS clicks,
  SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(page_views), 0)) AS page_views_rpm,
  SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(total_impressions), 0)) AS impressions_rpm,
  SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(total_impressions), 0)) AS ctr,
  SAFE_DIVIDE(SUM(matched_ad_requests), NULLIF(SUM(ad_requests), 0)) AS fill_rate
FROM ${getAdSenseReportingRawTableRef()}
WHERE report_date >= DATE(@startDate)
  AND report_date <= DATE(@endDate)
GROUP BY page_key
ORDER BY estimated_earnings DESC, page_key ASC
LIMIT @limit
OFFSET @offset`,
        parameters: [
          ...getDateParameters(window),
          { name: "limit", type: "INT64", value: limit },
          { name: "offset", type: "INT64", value: offset },
        ],
        maxResults: limit,
      }),
      runBigQueryQuery({
        query: `
SELECT COUNT(*) AS total_count
FROM (
  SELECT COALESCE(NULLIF(dimension_page_url, ""), "page_inconnue") AS page_key
  FROM ${getAdSenseReportingRawTableRef()}
  WHERE report_date >= DATE(@startDate)
    AND report_date <= DATE(@endDate)
  GROUP BY page_key
)`,
        parameters: getDateParameters(window),
        maxResults: 1,
      }),
    ]);

    const rows = rowsResult.rows.map((row) => ({
      pageKey: toNullableString(row.page_key) ?? "page_inconnue",
      estimatedEarnings: toSafeNumber(row.estimated_earnings, 0),
      pageViews: toSafeNumber(row.page_views, 0),
      adRequests: toSafeNumber(row.ad_requests, 0),
      matchedAdRequests: toSafeNumber(row.matched_ad_requests, 0),
      totalImpressions: toSafeNumber(row.total_impressions, 0),
      clicks: toSafeNumber(row.clicks, 0),
      pageViewsRpm: toNullableNumber(row.page_views_rpm),
      impressionsRpm: toNullableNumber(row.impressions_rpm),
      ctr: toNullableNumber(row.ctr),
      fillRate: toNullableNumber(row.fill_rate),
    }));

    const totalCount = toSafeNumber(totalCountResult.rows[0]?.total_count, 0);

    return {
      period: {
        range: window.range,
        startAt: window.startAt,
        endAt: window.endAt,
      },
      rows,
      page: {
        limit,
        offset,
        returned: rows.length,
        totalCount,
        hasMore: offset + rows.length < totalCount,
        nextOffset: offset + rows.length < totalCount ? offset + limit : null,
      },
      source: "adsense_reporting_raw",
    };
  }

  if (tables.adsMetricsDaily) {
    const [rowsResult, totalCountResult] = await Promise.all([
      runBigQueryQuery({
        query: `
SELECT
  COALESCE(NULLIF(page_template, ""), "inconnu") AS page_key,
  SUM(estimated_earnings) AS estimated_earnings,
  SUM(page_views) AS page_views,
  SUM(ad_requests) AS ad_requests,
  SUM(matched_ad_requests) AS matched_ad_requests,
  SUM(total_impressions) AS total_impressions,
  SUM(clicks) AS clicks,
  SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(page_views), 0)) AS page_views_rpm,
  SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(total_impressions), 0)) AS impressions_rpm,
  SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(total_impressions), 0)) AS ctr,
  SAFE_DIVIDE(SUM(matched_ad_requests), NULLIF(SUM(ad_requests), 0)) AS fill_rate
FROM ${getAdsMetricsDailyTableRef()}
WHERE date_key >= DATE(@startDate)
  AND date_key <= DATE(@endDate)
GROUP BY page_key
ORDER BY estimated_earnings DESC, page_key ASC
LIMIT @limit
OFFSET @offset`,
        parameters: [
          ...getDateParameters(window),
          { name: "limit", type: "INT64", value: limit },
          { name: "offset", type: "INT64", value: offset },
        ],
        maxResults: limit,
      }),
      runBigQueryQuery({
        query: `
SELECT COUNT(*) AS total_count
FROM (
  SELECT COALESCE(NULLIF(page_template, ""), "inconnu") AS page_key
  FROM ${getAdsMetricsDailyTableRef()}
  WHERE date_key >= DATE(@startDate)
    AND date_key <= DATE(@endDate)
  GROUP BY page_key
)`,
        parameters: getDateParameters(window),
        maxResults: 1,
      }),
    ]);

    const rows = rowsResult.rows.map((row) => ({
      pageKey: toNullableString(row.page_key) ?? "inconnu",
      estimatedEarnings: toSafeNumber(row.estimated_earnings, 0),
      pageViews: toSafeNumber(row.page_views, 0),
      adRequests: toSafeNumber(row.ad_requests, 0),
      matchedAdRequests: toSafeNumber(row.matched_ad_requests, 0),
      totalImpressions: toSafeNumber(row.total_impressions, 0),
      clicks: toSafeNumber(row.clicks, 0),
      pageViewsRpm: toNullableNumber(row.page_views_rpm),
      impressionsRpm: toNullableNumber(row.impressions_rpm),
      ctr: toNullableNumber(row.ctr),
      fillRate: toNullableNumber(row.fill_rate),
    }));

    const totalCount = toSafeNumber(totalCountResult.rows[0]?.total_count, 0);

    return {
      period: {
        range: window.range,
        startAt: window.startAt,
        endAt: window.endAt,
      },
      rows,
      page: {
        limit,
        offset,
        returned: rows.length,
        totalCount,
        hasMore: offset + rows.length < totalCount,
        nextOffset: offset + rows.length < totalCount ? offset + limit : null,
      },
      source: "ads_metrics_daily",
    };
  }

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    rows: [],
    page: {
      limit,
      offset,
      returned: 0,
      totalCount: 0,
      hasMore: false,
      nextOffset: null,
    },
    source: "none",
  };
}

function pctDelta(current: number, previous: number) {
  if (previous <= 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

export async function listAdsAlerts(input: AdsAnalyticsBaseInput): Promise<AdsAlertsResult> {
  const window = resolveDateWindow(input);
  const timeseries = await listAdsRevenueTimeseries({
    range: window.range,
    start: window.startAt,
    end: window.endAt,
  });

  const alerts: AdsAlert[] = [];

  if (timeseries.points.length === 0) {
    alerts.push({
      id: "ads-no-data",
      level: "warning",
      title: "Aucune donnée monétisation",
      message: "Aucune métrique Ads n'a été trouvée pour la période demandée.",
      metric: "data_presence",
      value: null,
      threshold: null,
      dateKey: null,
    });
  } else {
    const latest = timeseries.points[0];
    const previous = timeseries.points[1];

    if (previous) {
      const revenueDelta = pctDelta(latest.estimatedEarnings, previous.estimatedEarnings);
      if (revenueDelta !== null && revenueDelta <= -40) {
        alerts.push({
          id: "ads-revenue-drop-critical",
          level: "critical",
          title: "Chute forte du revenu journalier",
          message: `Le revenu journalier baisse de ${Math.abs(revenueDelta).toFixed(1)}% par rapport à la veille.`,
          metric: "estimated_earnings_delta_pct",
          value: revenueDelta,
          threshold: -40,
          dateKey: latest.dateKey,
        });
      } else if (revenueDelta !== null && revenueDelta <= -25) {
        alerts.push({
          id: "ads-revenue-drop-warning",
          level: "warning",
          title: "Baisse du revenu journalier",
          message: `Le revenu journalier baisse de ${Math.abs(revenueDelta).toFixed(1)}% par rapport à la veille.`,
          metric: "estimated_earnings_delta_pct",
          value: revenueDelta,
          threshold: -25,
          dateKey: latest.dateKey,
        });
      }
    }

    if (latest.fillRate !== null && latest.fillRate < 0.5) {
      alerts.push({
        id: "ads-fill-rate-warning",
        level: "warning",
        title: "Fill rate faible",
        message: `Le fill rate est descendu à ${(latest.fillRate * 100).toFixed(1)}%.`,
        metric: "fill_rate",
        value: latest.fillRate,
        threshold: 0.5,
        dateKey: latest.dateKey,
      });
    }

    if (latest.ctr !== null && latest.ctr < 0.003) {
      alerts.push({
        id: "ads-ctr-warning",
        level: "warning",
        title: "CTR faible",
        message: `Le CTR journalier est à ${(latest.ctr * 100).toFixed(2)}%.`,
        metric: "ctr",
        value: latest.ctr,
        threshold: 0.003,
        dateKey: latest.dateKey,
      });
    }

    if (latest.viewability !== null && latest.viewability < 0.45) {
      alerts.push({
        id: "ads-viewability-warning",
        level: "warning",
        title: "Viewability faible",
        message: `La viewability moyenne est à ${(latest.viewability * 100).toFixed(1)}%.`,
        metric: "viewability",
        value: latest.viewability,
        threshold: 0.45,
        dateKey: latest.dateKey,
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: "ads-no-alert",
        level: "info",
        title: "Aucune alerte critique",
        message: "Les indicateurs principaux sont stables sur la période demandée.",
        metric: "health",
        value: null,
        threshold: null,
        dateKey: latest.dateKey,
      });
    }
  }

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    generatedAt: new Date().toISOString(),
    alerts,
  };
}

const COMPARISON_ORDER: AdsPeriodComparisonKey[] = ["J-1", "7j", "30j", "MTD"];

function mapComparisonRow(
  row: Record<string, unknown>,
): AdsPeriodComparisonRow {
  const keyRaw = toNullableString(row.period_key) ?? "7j";
  const key = COMPARISON_ORDER.includes(keyRaw as AdsPeriodComparisonKey)
    ? (keyRaw as AdsPeriodComparisonKey)
    : "7j";

  return {
    key,
    label: toNullableString(row.period_label) ?? key,
    currentStartDate: toNullableString(row.current_start_date) ?? "",
    currentEndDate: toNullableString(row.current_end_date) ?? "",
    previousStartDate: toNullableString(row.previous_start_date) ?? "",
    previousEndDate: toNullableString(row.previous_end_date) ?? "",
    currentRevenue: toSafeNumber(row.current_revenue, 0),
    previousRevenue: toSafeNumber(row.previous_revenue, 0),
    revenueDelta: toSafeNumber(row.revenue_delta, 0),
    revenueDeltaPercent: toNullableNumber(row.revenue_delta_percent),
    currentFillRate: toNullableNumber(row.current_fill_rate),
    previousFillRate: toNullableNumber(row.previous_fill_rate),
    fillRateDeltaPercent: toNullableNumber(row.fill_rate_delta_percent),
    currentCtr: toNullableNumber(row.current_ctr),
    previousCtr: toNullableNumber(row.previous_ctr),
    ctrDeltaPercent: toNullableNumber(row.ctr_delta_percent),
    currentPageViewsRpm: toNullableNumber(row.current_page_views_rpm),
    previousPageViewsRpm: toNullableNumber(row.previous_page_views_rpm),
    pageViewsRpmDeltaPercent: toNullableNumber(row.page_views_rpm_delta_percent),
  };
}

export async function listAdsPeriodComparisons(): Promise<AdsPeriodComparisonsResult> {
  const tables = await getAdsTablesAvailability();
  if (!tables.adsMetricsDaily) {
    return {
      generatedAt: new Date().toISOString(),
      rows: [],
    };
  }

  const result = await runBigQueryQuery({
    query: `
WITH bounds AS (
  SELECT
    CURRENT_DATE("UTC") AS today,
    DATE_SUB(CURRENT_DATE("UTC"), INTERVAL 1 DAY) AS last_complete_day,
    DATE_TRUNC(CURRENT_DATE("UTC"), MONTH) AS current_month_start,
    DATE_TRUNC(DATE_SUB(CURRENT_DATE("UTC"), INTERVAL 1 MONTH), MONTH) AS previous_month_start
),
periods AS (
  SELECT
    "J-1" AS period_key,
    "Comparaison J-1" AS period_label,
    DATE_SUB(last_complete_day, INTERVAL 0 DAY) AS current_start_date,
    last_complete_day AS current_end_date,
    DATE_SUB(last_complete_day, INTERVAL 1 DAY) AS previous_start_date,
    DATE_SUB(last_complete_day, INTERVAL 1 DAY) AS previous_end_date
  FROM bounds

  UNION ALL

  SELECT
    "7j" AS period_key,
    "Comparaison 7 jours" AS period_label,
    DATE_SUB(today, INTERVAL 7 DAY) AS current_start_date,
    DATE_SUB(today, INTERVAL 1 DAY) AS current_end_date,
    DATE_SUB(today, INTERVAL 14 DAY) AS previous_start_date,
    DATE_SUB(today, INTERVAL 8 DAY) AS previous_end_date
  FROM bounds

  UNION ALL

  SELECT
    "30j" AS period_key,
    "Comparaison 30 jours" AS period_label,
    DATE_SUB(today, INTERVAL 30 DAY) AS current_start_date,
    DATE_SUB(today, INTERVAL 1 DAY) AS current_end_date,
    DATE_SUB(today, INTERVAL 60 DAY) AS previous_start_date,
    DATE_SUB(today, INTERVAL 31 DAY) AS previous_end_date
  FROM bounds

  UNION ALL

  SELECT
    "MTD" AS period_key,
    "Comparaison MTD" AS period_label,
    current_month_start AS current_start_date,
    last_complete_day AS current_end_date,
    previous_month_start AS previous_start_date,
    LEAST(
      DATE_ADD(
        previous_month_start,
        INTERVAL DATE_DIFF(last_complete_day, current_month_start, DAY) DAY
      ),
      DATE_SUB(current_month_start, INTERVAL 1 DAY)
    ) AS previous_end_date
  FROM bounds
),
metrics_window AS (
  SELECT
    date_key,
    estimated_earnings,
    matched_ad_requests,
    ad_requests,
    clicks,
    total_impressions,
    page_views
  FROM ${getAdsMetricsDailyTableRef()}
  -- Required partition filter (date_key) to satisfy BigQuery partition elimination.
  WHERE date_key BETWEEN DATE_SUB(CURRENT_DATE("UTC"), INTERVAL 120 DAY)
    AND DATE_SUB(CURRENT_DATE("UTC"), INTERVAL 1 DAY)
),
current_agg AS (
  SELECT
    p.period_key,
    p.period_label,
    p.current_start_date,
    p.current_end_date,
    p.previous_start_date,
    p.previous_end_date,
    SUM(IF(m.date_key BETWEEN p.current_start_date AND p.current_end_date, m.estimated_earnings, 0)) AS current_revenue,
    SAFE_DIVIDE(
      SUM(IF(m.date_key BETWEEN p.current_start_date AND p.current_end_date, m.matched_ad_requests, 0)),
      NULLIF(SUM(IF(m.date_key BETWEEN p.current_start_date AND p.current_end_date, m.ad_requests, 0)), 0)
    ) AS current_fill_rate,
    SAFE_DIVIDE(
      SUM(IF(m.date_key BETWEEN p.current_start_date AND p.current_end_date, m.clicks, 0)),
      NULLIF(SUM(IF(m.date_key BETWEEN p.current_start_date AND p.current_end_date, m.total_impressions, 0)), 0)
    ) AS current_ctr,
    SAFE_DIVIDE(
      SUM(IF(m.date_key BETWEEN p.current_start_date AND p.current_end_date, m.estimated_earnings, 0)) * 1000,
      NULLIF(SUM(IF(m.date_key BETWEEN p.current_start_date AND p.current_end_date, m.page_views, 0)), 0)
    ) AS current_page_views_rpm
  FROM periods p
  LEFT JOIN metrics_window m
    ON m.date_key BETWEEN p.current_start_date AND p.current_end_date
    OR m.date_key BETWEEN p.previous_start_date AND p.previous_end_date
  GROUP BY
    p.period_key,
    p.period_label,
    p.current_start_date,
    p.current_end_date,
    p.previous_start_date,
    p.previous_end_date
),
full_agg AS (
  SELECT
    c.period_key,
    c.period_label,
    c.current_start_date,
    c.current_end_date,
    c.previous_start_date,
    c.previous_end_date,
    c.current_revenue,
    SUM(IF(m.date_key BETWEEN c.previous_start_date AND c.previous_end_date, m.estimated_earnings, 0)) AS previous_revenue,
    c.current_fill_rate,
    SAFE_DIVIDE(
      SUM(IF(m.date_key BETWEEN c.previous_start_date AND c.previous_end_date, m.matched_ad_requests, 0)),
      NULLIF(SUM(IF(m.date_key BETWEEN c.previous_start_date AND c.previous_end_date, m.ad_requests, 0)), 0)
    ) AS previous_fill_rate,
    c.current_ctr,
    SAFE_DIVIDE(
      SUM(IF(m.date_key BETWEEN c.previous_start_date AND c.previous_end_date, m.clicks, 0)),
      NULLIF(SUM(IF(m.date_key BETWEEN c.previous_start_date AND c.previous_end_date, m.total_impressions, 0)), 0)
    ) AS previous_ctr,
    c.current_page_views_rpm,
    SAFE_DIVIDE(
      SUM(IF(m.date_key BETWEEN c.previous_start_date AND c.previous_end_date, m.estimated_earnings, 0)) * 1000,
      NULLIF(SUM(IF(m.date_key BETWEEN c.previous_start_date AND c.previous_end_date, m.page_views, 0)), 0)
    ) AS previous_page_views_rpm
  FROM current_agg c
  LEFT JOIN metrics_window m
    ON m.date_key BETWEEN c.previous_start_date AND c.previous_end_date
  GROUP BY
    c.period_key,
    c.period_label,
    c.current_start_date,
    c.current_end_date,
    c.previous_start_date,
    c.previous_end_date,
    c.current_revenue,
    c.current_fill_rate,
    c.current_ctr,
    c.current_page_views_rpm
)
SELECT
  period_key,
  period_label,
  FORMAT_DATE('%Y-%m-%d', current_start_date) AS current_start_date,
  FORMAT_DATE('%Y-%m-%d', current_end_date) AS current_end_date,
  FORMAT_DATE('%Y-%m-%d', previous_start_date) AS previous_start_date,
  FORMAT_DATE('%Y-%m-%d', previous_end_date) AS previous_end_date,
  current_revenue,
  previous_revenue,
  (current_revenue - previous_revenue) AS revenue_delta,
  IF(previous_revenue = 0, NULL, SAFE_DIVIDE((current_revenue - previous_revenue) * 100, previous_revenue)) AS revenue_delta_percent,
  current_fill_rate,
  previous_fill_rate,
  IF(previous_fill_rate = 0 OR previous_fill_rate IS NULL, NULL, SAFE_DIVIDE((current_fill_rate - previous_fill_rate) * 100, previous_fill_rate)) AS fill_rate_delta_percent,
  current_ctr,
  previous_ctr,
  IF(previous_ctr = 0 OR previous_ctr IS NULL, NULL, SAFE_DIVIDE((current_ctr - previous_ctr) * 100, previous_ctr)) AS ctr_delta_percent,
  current_page_views_rpm,
  previous_page_views_rpm,
  IF(previous_page_views_rpm = 0 OR previous_page_views_rpm IS NULL, NULL, SAFE_DIVIDE((current_page_views_rpm - previous_page_views_rpm) * 100, previous_page_views_rpm)) AS page_views_rpm_delta_percent
FROM full_agg
ORDER BY CASE period_key WHEN "J-1" THEN 1 WHEN "7j" THEN 2 WHEN "30j" THEN 3 WHEN "MTD" THEN 4 ELSE 99 END`,
    maxResults: 10,
  });

  return {
    generatedAt: new Date().toISOString(),
    rows: result.rows.map((row) => mapComparisonRow(row)),
  };
}

export async function listAdsExportRows(input: AdsAnalyticsBaseInput) {
  const timeseries = await listAdsRevenueTimeseries(input);
  return timeseries.points;
}
