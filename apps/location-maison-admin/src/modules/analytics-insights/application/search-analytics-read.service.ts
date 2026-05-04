import {
  getBigQueryRuntimeContext,
  runBigQueryQuery,
  type BigQueryQueryParam,
} from "@/modules/analytics-insights/infrastructure/analytics-bigquery.repository";

export type SearchAnalyticsRange = "24h" | "7d" | "30d" | "custom";
export type SearchAnalyticsSourceFilter =
  | "all"
  | "catalog_search_page"
  | "location_maison_search_bar"
  | "search_with_ia_page";
export type SearchAnalyticsResultFilter =
  | "all"
  | "with_results"
  | "without_results"
  | "pending";

export type SearchAnalyticsListInput = {
  range?: SearchAnalyticsRange;
  start?: string;
  end?: string;
  source?: SearchAnalyticsSourceFilter;
  resultFilter?: SearchAnalyticsResultFilter;
  query?: string;
  limit?: number;
  offset?: number;
  topQueriesLimit?: number;
};

type SearchSummaryRow = {
  total_searches: number;
  with_results: number;
  without_results: number;
  pending_results: number;
};

type SearchRow = {
  search_id: string;
  occurred_at: string;
  source: string;
  query_text_raw: string | null;
  query_text_normalized: string | null;
  filters_json: string | null;
  page: number | null;
  page_size: number | null;
  results_count: number | null;
  has_results: boolean | null;
  execution_ms: number | null;
  engine: string | null;
  actor_id: string | null;
  is_authenticated: boolean | null;
  session_id: string | null;
  correlation_id: string | null;
};

type DateWindow = {
  range: SearchAnalyticsRange;
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

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = toSafeNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableBoolean(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return null;
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toResultStatus(value: boolean | null): SearchAnalyticsResultFilter {
  if (value === true) {
    return "with_results";
  }
  if (value === false) {
    return "without_results";
  }
  return "pending";
}

function normalizeQueryText(value?: string) {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseJsonObject(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveDateWindow(input: SearchAnalyticsListInput): DateWindow {
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

function getSearchTableRef() {
  const runtime = getBigQueryRuntimeContext();
  return `\`${runtime.projectId}.${runtime.datasetId}.search_events\``;
}

function buildBaseQuery() {
  return `
WITH events_in_range AS (
  SELECT
    search_id,
    search_performed_event_id,
    search_result_event_id,
    source,
    occurred_at,
    query_text_raw,
    query_text_normalized,
    TO_JSON_STRING(filters_json) AS filters_json,
    page,
    page_size,
    results_count,
    has_results,
    execution_ms,
    engine,
    actor_id,
    is_authenticated,
    session_id,
    correlation_id
  FROM ${getSearchTableRef()}
  WHERE occurred_at >= TIMESTAMP(@startAt)
    AND occurred_at < TIMESTAMP(@endAt)
    AND (@source = "all" OR source = @source)
),
searches AS (
  SELECT
    search_id,
    MIN(occurred_at) AS occurred_at,
    ARRAY_AGG(source ORDER BY occurred_at DESC LIMIT 1)[SAFE_OFFSET(0)] AS source,
    ARRAY_AGG(query_text_raw IGNORE NULLS ORDER BY occurred_at ASC LIMIT 1)[SAFE_OFFSET(0)] AS query_text_raw,
    ARRAY_AGG(query_text_normalized IGNORE NULLS ORDER BY occurred_at ASC LIMIT 1)[SAFE_OFFSET(0)] AS query_text_normalized,
    ARRAY_AGG(filters_json IGNORE NULLS ORDER BY occurred_at ASC LIMIT 1)[SAFE_OFFSET(0)] AS filters_json,
    ARRAY_AGG(page IGNORE NULLS ORDER BY occurred_at ASC LIMIT 1)[SAFE_OFFSET(0)] AS page,
    ARRAY_AGG(page_size IGNORE NULLS ORDER BY occurred_at ASC LIMIT 1)[SAFE_OFFSET(0)] AS page_size,
    ARRAY_AGG(results_count IGNORE NULLS ORDER BY occurred_at DESC LIMIT 1)[SAFE_OFFSET(0)] AS results_count,
    ARRAY_AGG(has_results IGNORE NULLS ORDER BY occurred_at DESC LIMIT 1)[SAFE_OFFSET(0)] AS has_results,
    ARRAY_AGG(execution_ms IGNORE NULLS ORDER BY occurred_at DESC LIMIT 1)[SAFE_OFFSET(0)] AS execution_ms,
    ARRAY_AGG(engine IGNORE NULLS ORDER BY occurred_at DESC LIMIT 1)[SAFE_OFFSET(0)] AS engine,
    ARRAY_AGG(actor_id IGNORE NULLS ORDER BY occurred_at DESC LIMIT 1)[SAFE_OFFSET(0)] AS actor_id,
    ARRAY_AGG(is_authenticated IGNORE NULLS ORDER BY occurred_at DESC LIMIT 1)[SAFE_OFFSET(0)] AS is_authenticated,
    ARRAY_AGG(session_id IGNORE NULLS ORDER BY occurred_at DESC LIMIT 1)[SAFE_OFFSET(0)] AS session_id,
    ARRAY_AGG(correlation_id IGNORE NULLS ORDER BY occurred_at DESC LIMIT 1)[SAFE_OFFSET(0)] AS correlation_id
  FROM events_in_range
  GROUP BY search_id
  HAVING COUNTIF(search_performed_event_id IS NOT NULL) > 0
),
filtered AS (
  SELECT *
  FROM searches
  WHERE
    (
      @queryText = ""
      OR LOWER(COALESCE(query_text_normalized, query_text_raw, "")) LIKE CONCAT("%", @queryText, "%")
    )
    AND (
      @resultFilter = "all"
      OR (@resultFilter = "with_results" AND has_results IS TRUE)
      OR (@resultFilter = "without_results" AND has_results IS FALSE)
      OR (@resultFilter = "pending" AND has_results IS NULL)
    )
)
`;
}

function buildBaseParameters(input: {
  startAt: string;
  endAt: string;
  source: SearchAnalyticsSourceFilter;
  queryText: string;
  resultFilter: SearchAnalyticsResultFilter;
}): BigQueryQueryParam[] {
  return [
    { name: "startAt", type: "STRING", value: input.startAt },
    { name: "endAt", type: "STRING", value: input.endAt },
    { name: "source", type: "STRING", value: input.source },
    { name: "queryText", type: "STRING", value: input.queryText },
    { name: "resultFilter", type: "STRING", value: input.resultFilter },
  ];
}

function mapSearchSummary(row: Record<string, unknown> | undefined): SearchSummaryRow {
  return {
    total_searches: toSafeNumber(row?.total_searches, 0),
    with_results: toSafeNumber(row?.with_results, 0),
    without_results: toSafeNumber(row?.without_results, 0),
    pending_results: toSafeNumber(row?.pending_results, 0),
  };
}

function mapSearchSourceBreakdown(rows: Record<string, unknown>[]) {
  return rows
    .map((row) => ({
      source: toNullableString(row.source) ?? "unknown",
      searches: toSafeNumber(row.searches, 0),
    }))
    .sort((a, b) => b.searches - a.searches);
}

function mapTopQueries(rows: Record<string, unknown>[]) {
  return rows
    .map((row) => ({
      queryText: toNullableString(row.query_text) ?? "(vide)",
      searches: toSafeNumber(row.searches, 0),
      withResults: toSafeNumber(row.with_results, 0),
      withoutResults: toSafeNumber(row.without_results, 0),
      pendingResults: toSafeNumber(row.pending_results, 0),
    }))
    .filter((row) => row.searches > 0);
}

function mapSearchRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const data = row as SearchRow;
    const hasResults = toNullableBoolean(data.has_results);

    return {
      searchId: toNullableString(data.search_id) ?? "",
      occurredAt: toNullableString(data.occurred_at) ?? "",
      source: toNullableString(data.source) ?? "unknown",
      queryTextRaw: toNullableString(data.query_text_raw),
      queryTextNormalized: toNullableString(data.query_text_normalized),
      filters: parseJsonObject(toNullableString(data.filters_json)),
      page: toNullableNumber(data.page),
      pageSize: toNullableNumber(data.page_size),
      resultsCount: toNullableNumber(data.results_count),
      hasResults,
      resultStatus: toResultStatus(hasResults),
      executionMs: toNullableNumber(data.execution_ms),
      engine: toNullableString(data.engine),
      actorId: toNullableString(data.actor_id),
      isAuthenticated: toNullableBoolean(data.is_authenticated),
      sessionId: toNullableString(data.session_id),
      correlationId: toNullableString(data.correlation_id),
    };
  });
}

export async function listSearchAnalytics(input: SearchAnalyticsListInput) {
  const window = resolveDateWindow(input);
  const source = input.source ?? "all";
  const resultFilter = input.resultFilter ?? "all";
  const queryText = normalizeQueryText(input.query);
  const limit = Math.max(1, Math.min(200, input.limit ?? 50));
  const offset = Math.max(0, input.offset ?? 0);
  const topQueriesLimit = Math.max(1, Math.min(50, input.topQueriesLimit ?? 10));
  const baseSql = buildBaseQuery();
  const baseParameters = buildBaseParameters({
    startAt: window.startAt,
    endAt: window.endAt,
    source,
    queryText,
    resultFilter,
  });

  const [summaryResult, sourceResult, topResult, listResult] = await Promise.all([
    runBigQueryQuery({
      query: `${baseSql}
SELECT
  COUNT(*) AS total_searches,
  COUNTIF(has_results IS TRUE) AS with_results,
  COUNTIF(has_results IS FALSE) AS without_results,
  COUNTIF(has_results IS NULL) AS pending_results
FROM filtered`,
      parameters: baseParameters,
      maxResults: 1,
    }),
    runBigQueryQuery({
      query: `${baseSql}
SELECT
  source,
  COUNT(*) AS searches
FROM filtered
GROUP BY source
ORDER BY searches DESC, source ASC`,
      parameters: baseParameters,
      maxResults: 20,
    }),
    runBigQueryQuery({
      query: `${baseSql}
SELECT
  COALESCE(NULLIF(query_text_normalized, ""), NULLIF(LOWER(query_text_raw), "")) AS query_text,
  COUNT(*) AS searches,
  COUNTIF(has_results IS TRUE) AS with_results,
  COUNTIF(has_results IS FALSE) AS without_results,
  COUNTIF(has_results IS NULL) AS pending_results
FROM filtered
WHERE COALESCE(query_text_normalized, query_text_raw, "") != ""
GROUP BY query_text
ORDER BY searches DESC, query_text ASC
LIMIT @topLimit`,
      parameters: [...baseParameters, { name: "topLimit", type: "INT64", value: topQueriesLimit }],
      maxResults: topQueriesLimit,
    }),
    runBigQueryQuery({
      query: `${baseSql}
SELECT
  search_id,
  FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E3SZ', occurred_at) AS occurred_at,
  source,
  query_text_raw,
  query_text_normalized,
  filters_json,
  page,
  page_size,
  results_count,
  has_results,
  execution_ms,
  engine,
  actor_id,
  is_authenticated,
  session_id,
  correlation_id
FROM filtered
ORDER BY occurred_at DESC
LIMIT @limit
OFFSET @offset`,
      parameters: [
        ...baseParameters,
        { name: "limit", type: "INT64", value: limit },
        { name: "offset", type: "INT64", value: offset },
      ],
      maxResults: limit,
    }),
  ]);

  const summary = mapSearchSummary(summaryResult.rows[0]);
  const totalSearches = summary.total_searches;
  const searches = mapSearchRows(listResult.rows);

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    filters: {
      source,
      resultFilter,
      queryText,
    },
    summary: {
      totalSearches: summary.total_searches,
      withResults: summary.with_results,
      withoutResults: summary.without_results,
      pendingResults: summary.pending_results,
      successRate:
        summary.total_searches > 0
          ? Number(((summary.with_results / summary.total_searches) * 100).toFixed(2))
          : 0,
    },
    sources: mapSearchSourceBreakdown(sourceResult.rows),
    topQueries: mapTopQueries(topResult.rows),
    searches,
    page: {
      limit,
      offset,
      returned: searches.length,
      totalCount: totalSearches,
      hasMore: offset + searches.length < totalSearches,
      nextOffset: offset + searches.length < totalSearches ? offset + searches.length : null,
    },
  };
}

export async function listTopSearchQueries(
  input: Omit<SearchAnalyticsListInput, "limit" | "offset" | "topQueriesLimit"> & {
    topQueriesLimit?: number;
  },
) {
  const result = await listSearchAnalytics({
    ...input,
    limit: 1,
    offset: 0,
    topQueriesLimit: input.topQueriesLimit ?? 20,
  });

  return {
    period: result.period,
    filters: result.filters,
    totalSearches: result.summary.totalSearches,
    topQueries: result.topQueries,
  };
}

export async function getSearchResultRate(
  input: Omit<SearchAnalyticsListInput, "limit" | "offset" | "topQueriesLimit" | "query">,
) {
  const result = await listSearchAnalytics({
    ...input,
    limit: 1,
    offset: 0,
    topQueriesLimit: 1,
    query: "",
  });

  return {
    period: result.period,
    filters: {
      source: result.filters.source,
    },
    metrics: result.summary,
  };
}
