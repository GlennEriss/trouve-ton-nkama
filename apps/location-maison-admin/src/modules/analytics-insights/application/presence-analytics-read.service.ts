import { listAdminUsers } from "@/modules/iam/infrastructure/admin-user.repository";
import {
  runBigQueryQuery,
  getBigQueryRuntimeContext,
  type BigQueryQueryParam,
} from "@/modules/analytics-insights/infrastructure/analytics-bigquery.repository";

export type PresenceAnalyticsRange = "24h" | "7d" | "30d" | "custom";
export type PresenceSubject = "user" | "admin";

export type PresenceDateWindowInput = {
  range?: PresenceAnalyticsRange;
  start?: string;
  end?: string;
};

type DateWindow = {
  range: PresenceAnalyticsRange;
  startAt: string;
  endAt: string;
};

const CURSOR_PREFIX = "offset:";
const ONLINE_THRESHOLD_SECONDS = Number(
  process.env.ANALYTICS_PRESENCE_ONLINE_THRESHOLD_SECONDS ?? 300,
);
const MAX_ADMIN_SCAN = Number(process.env.ADMIN_PRESENCE_SCAN_LIMIT ?? 5000);

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

function toNullableBoolean(value: unknown) {
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

function getPresenceTableRef() {
  const runtime = getBigQueryRuntimeContext();
  return `\`${runtime.projectId}.${runtime.datasetId}.presence_events\``;
}

function resolveDateWindow(input: PresenceDateWindowInput): DateWindow {
  const range = input.range ?? "7d";
  const now = new Date();

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

function encodeCursor(offset: number) {
  return Buffer.from(`${CURSOR_PREFIX}${offset}`, "utf8").toString("base64url");
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) {
    return 0;
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    if (!decoded.startsWith(CURSOR_PREFIX)) {
      throw new Error("invalid");
    }
    const value = Number(decoded.slice(CURSOR_PREFIX.length));
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("invalid");
    }
    return value;
  } catch {
    throw new Error("INVALID_CURSOR");
  }
}

function buildPresenceBaseQuery() {
  return `
WITH filtered AS (
  SELECT
    subject_id,
    session_id,
    status,
    last_seen_at,
    device_type,
    app_surface,
    source,
    occurred_at,
    correlation_id
  FROM ${getPresenceTableRef()}
  WHERE occurred_at >= TIMESTAMP(@startAt)
    AND occurred_at < TIMESTAMP(@endAt)
    AND presence_subject = @subject
),
latest AS (
  SELECT
    subject_id,
    session_id,
    status,
    last_seen_at,
    device_type,
    app_surface,
    source,
    occurred_at,
    correlation_id
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY subject_id
        ORDER BY last_seen_at DESC, occurred_at DESC
      ) AS rn
    FROM filtered
  )
  WHERE rn = 1
),
enriched AS (
  SELECT
    subject_id,
    session_id,
    status,
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E3SZ', last_seen_at) AS last_seen_at,
    device_type,
    app_surface,
    source,
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E3SZ', occurred_at) AS occurred_at,
    correlation_id,
    (status = "online" AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_seen_at, SECOND) <= @onlineThresholdSeconds) AS is_online
  FROM latest
)
`;
}

function buildBaseParams(input: {
  startAt: string;
  endAt: string;
  subject: PresenceSubject;
}) {
  return [
    { name: "startAt", type: "STRING", value: input.startAt },
    { name: "endAt", type: "STRING", value: input.endAt },
    { name: "subject", type: "STRING", value: input.subject },
    {
      name: "onlineThresholdSeconds",
      type: "INT64",
      value: Math.max(10, ONLINE_THRESHOLD_SECONDS),
    },
  ] as BigQueryQueryParam[];
}

function mapPresenceRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    subjectId: toNullableString(row.subject_id) ?? "",
    sessionId: toNullableString(row.session_id),
    status: toNullableString(row.status) ?? "offline",
    lastSeenAt: toNullableString(row.last_seen_at),
    occurredAt: toNullableString(row.occurred_at),
    source: toNullableString(row.source),
    deviceType: toNullableString(row.device_type),
    appSurface: toNullableString(row.app_surface),
    correlationId: toNullableString(row.correlation_id),
    isOnline: toNullableBoolean(row.is_online) ?? false,
  }));
}

export async function listPresenceOnline(input: PresenceDateWindowInput & {
  subject: PresenceSubject;
  limit?: number;
}) {
  const window = resolveDateWindow(input);
  const limit = Math.max(1, Math.min(500, input.limit ?? 100));
  const baseSql = buildPresenceBaseQuery();
  const baseParams = buildBaseParams({
    startAt: window.startAt,
    endAt: window.endAt,
    subject: input.subject,
  });

  const [statsResult, rowsResult] = await Promise.all([
    runBigQueryQuery({
      query: `${baseSql}
SELECT
  COUNT(*) AS total_subjects,
  COUNTIF(is_online IS TRUE) AS online_subjects
FROM enriched`,
      parameters: baseParams,
      maxResults: 1,
    }),
    runBigQueryQuery({
      query: `${baseSql}
SELECT
  subject_id,
  session_id,
  status,
  last_seen_at,
  device_type,
  app_surface,
  source,
  occurred_at,
  correlation_id,
  is_online
FROM enriched
WHERE is_online IS TRUE
ORDER BY last_seen_at DESC
LIMIT @limit`,
      parameters: [...baseParams, { name: "limit", type: "INT64", value: limit }],
      maxResults: limit,
    }),
  ]);

  const stats = statsResult.rows[0];
  const records = mapPresenceRows(rowsResult.rows);

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    subject: input.subject,
    summary: {
      totalSubjects: toSafeNumber(stats?.total_subjects, 0),
      onlineSubjects: toSafeNumber(stats?.online_subjects, 0),
      offlineSubjects:
        toSafeNumber(stats?.total_subjects, 0) - toSafeNumber(stats?.online_subjects, 0),
    },
    records,
    limit,
  };
}

export async function listPresenceLastSeen(input: PresenceDateWindowInput & {
  subject: PresenceSubject;
  limit?: number;
  cursor?: string | null;
}) {
  const window = resolveDateWindow(input);
  const limit = Math.max(1, Math.min(500, input.limit ?? 100));
  const offset = decodeCursor(input.cursor ?? null);
  const baseSql = buildPresenceBaseQuery();
  const baseParams = buildBaseParams({
    startAt: window.startAt,
    endAt: window.endAt,
    subject: input.subject,
  });

  const [countResult, rowsResult] = await Promise.all([
    runBigQueryQuery({
      query: `${baseSql}
SELECT COUNT(*) AS total_subjects
FROM enriched`,
      parameters: baseParams,
      maxResults: 1,
    }),
    runBigQueryQuery({
      query: `${baseSql}
SELECT
  subject_id,
  session_id,
  status,
  last_seen_at,
  device_type,
  app_surface,
  source,
  occurred_at,
  correlation_id,
  is_online
FROM enriched
ORDER BY last_seen_at DESC
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

  const totalCount = toSafeNumber(countResult.rows[0]?.total_subjects, 0);
  const records = mapPresenceRows(rowsResult.rows);
  const nextOffset = offset + records.length;
  const hasMore = nextOffset < totalCount;

  return {
    period: {
      range: window.range,
      startAt: window.startAt,
      endAt: window.endAt,
    },
    subject: input.subject,
    records,
    page: {
      limit,
      cursor: input.cursor ?? null,
      nextCursor: hasMore ? encodeCursor(nextOffset) : null,
      hasMore,
      offset,
      returned: records.length,
      totalCount,
    },
  };
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export async function listAdminsLastLogin(input: {
  limit?: number;
  cursor?: string | null;
}) {
  const limit = Math.max(1, Math.min(500, input.limit ?? 100));
  const offset = decodeCursor(input.cursor ?? null);
  const scanLimit = Math.max(limit + offset + 50, 200);
  const admins = await listAdminUsers(Math.min(scanLimit, MAX_ADMIN_SCAN));

  const sorted = admins
    .slice()
    .sort((a, b) => toTimestamp(b.lastLoginAt) - toTimestamp(a.lastLoginAt));

  const rows = sorted.slice(offset, offset + limit).map((admin) => ({
    uid: admin.uid,
    email: admin.email,
    displayName: admin.displayName,
    roles: admin.roles,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt ?? null,
    lastSeenAt: admin.lastSeenAt ?? null,
    isOnline:
      toTimestamp(admin.lastSeenAt) > 0 &&
      Date.now() - toTimestamp(admin.lastSeenAt) <= ONLINE_THRESHOLD_SECONDS * 1000,
  }));

  const nextOffset = offset + rows.length;
  const hasMore = nextOffset < sorted.length;

  return {
    records: rows,
    page: {
      limit,
      cursor: input.cursor ?? null,
      nextCursor: hasMore ? encodeCursor(nextOffset) : null,
      hasMore,
      offset,
      returned: rows.length,
      totalCount: sorted.length,
    },
  };
}
