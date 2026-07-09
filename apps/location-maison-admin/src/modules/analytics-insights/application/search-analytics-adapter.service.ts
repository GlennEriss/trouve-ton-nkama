import { randomUUID } from "node:crypto";

import type {
  AnalyticsEnvironment,
  AnalyticsEventEnvelope,
  SearchPerformedPayload,
  SearchResultReturnedPayload,
} from "@/modules/analytics-insights/domain/analytics-ingestion.schema";
import type { SearchAnalyticsAdapterBody } from "@/modules/analytics-insights/domain/search-analytics-adapter.schema";

const PROPERTY_TYPES = [
  "Home",
  "Apartment",
  "Studio",
  "Villa",
  "Room",
  "Kiosk",
  "Shop",
  "Desk",
  "Building",
  "Land",
] as const;

const PROPERTY_TYPE_CANONICAL_MAP: Record<string, (typeof PROPERTY_TYPES)[number]> =
  PROPERTY_TYPES.reduce((acc, value) => {
    acc[value.toLowerCase()] = value;
    return acc;
  }, {} as Record<string, (typeof PROPERTY_TYPES)[number]>);

const PROPERTY_STATUS_VALUES = ["FOR_RENT", "FOR_SALE"] as const;
const CURRENCY_VALUES = ["XOF", "EUR", "USD"] as const;
const PROPERTY_STATUS_SET = new Set<string>(PROPERTY_STATUS_VALUES);
const CURRENCY_SET = new Set<string>(CURRENCY_VALUES);

type QueryValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>;

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function toStringList(value: QueryValue | undefined) {
  if (value === undefined || value === null) {
    return [];
  }

  const arrayValue = Array.isArray(value) ? value : [value];
  const rawValues = arrayValue.flatMap((item) => {
    if (item === null || item === undefined) {
      return [];
    }

    if (typeof item === "string") {
      return item.split(",");
    }

    return [String(item)];
  });

  return rawValues
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function pickFirstText(value: QueryValue | undefined) {
  const items = toStringList(value);
  return items.length > 0 ? items[0] : undefined;
}

function pickInt(value: QueryValue | undefined) {
  const text = pickFirstText(value);
  if (!text) {
    return undefined;
  }

  const parsed = Number.parseInt(text, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

function pickStatus(
  value: QueryValue | undefined,
): (typeof PROPERTY_STATUS_VALUES)[number] | undefined {
  const text = pickFirstText(value);
  if (!text) {
    return undefined;
  }

  const normalized = text.trim().toUpperCase();
  if (!PROPERTY_STATUS_SET.has(normalized)) {
    return undefined;
  }
  return normalized as (typeof PROPERTY_STATUS_VALUES)[number];
}

function pickCurrency(
  value: QueryValue | undefined,
): (typeof CURRENCY_VALUES)[number] | undefined {
  const text = pickFirstText(value);
  if (!text) {
    return undefined;
  }

  const normalized = text.trim().toUpperCase();
  if (!CURRENCY_SET.has(normalized)) {
    return undefined;
  }
  return normalized as (typeof CURRENCY_VALUES)[number];
}

function pickPropertyTypes(value: QueryValue | undefined) {
  const values = toStringList(value);
  const normalized = values
    .map((item) => PROPERTY_TYPE_CANONICAL_MAP[item.toLowerCase()])
    .filter((item): item is (typeof PROPERTY_TYPES)[number] => Boolean(item));

  return normalized.length > 0 ? normalized : undefined;
}

function cleanObject<T extends Record<string, unknown>>(input: T) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      continue;
    }

    output[key] = value;
  }

  return output as T;
}

function resolveEnvironment(value: AnalyticsEnvironment | undefined): AnalyticsEnvironment {
  if (value) {
    return value;
  }

  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (appEnv === "production" || appEnv === "prod") {
    return "prod";
  }
  if (appEnv === "preprod" || appEnv === "staging") {
    return "preprod";
  }
  return "dev";
}

function buildSearchPerformedPayload(
  input: SearchAnalyticsAdapterBody,
): SearchPerformedPayload {
  const queryParams = input.search.query_params ?? {};
  const queryText =
    input.search.query_text_raw ??
    pickFirstText(queryParams.query) ??
    pickFirstText(queryParams.q);

  const filters = cleanObject({
    property_types: pickPropertyTypes(queryParams.typeProperty),
    province: pickFirstText(queryParams.province),
    city: pickFirstText(queryParams.city),
    street: pickFirstText(queryParams.street),
    district: pickFirstText(queryParams.district),
    price_min: pickInt(queryParams.minPrice),
    price_max: pickInt(queryParams.maxPrice),
    min_area: pickInt(queryParams.minArea),
    max_area: pickInt(queryParams.maxArea),
    min_nbr_rooms: pickInt(queryParams.minNbrRooms),
    max_nbr_rooms: pickInt(queryParams.maxNbrRooms),
    status: pickStatus(queryParams.status),
    tags: toStringList(queryParams.tags),
    currency: pickCurrency(queryParams.currency),
  });

  return cleanObject({
    search_id: input.search.search_id ?? `srch_${randomUUID()}`,
    query_text_raw: queryText,
    query_text_normalized: queryText ? normalizeText(queryText) : undefined,
    filters,
    sort: input.search.sort ?? pickFirstText(queryParams.sort),
    page: input.search.page ?? pickInt(queryParams.page),
    page_size: input.search.page_size ?? pickInt(queryParams.page_size),
  });
}

function buildSearchResultPayload(
  searchId: string,
  result: NonNullable<SearchAnalyticsAdapterBody["result"]>,
): SearchResultReturnedPayload {
  return cleanObject({
    search_id: searchId,
    results_count: result.results_count,
    has_results: result.results_count > 0,
    result_ids_sample: result.result_ids_sample,
    execution_ms: result.execution_ms,
    engine: result.engine,
  });
}

export function buildSearchAdapterBatch(input: SearchAnalyticsAdapterBody) {
  const nowIso = new Date().toISOString();
  const occurredAt = input.occurred_at ?? nowIso;
  const environment = resolveEnvironment(input.environment);
  const correlationId = input.correlation_id ?? `corr_${randomUUID()}`;
  const performedPayload = buildSearchPerformedPayload(input);

  const performedEvent: AnalyticsEventEnvelope = {
    event_id: `evt_search_perf_${randomUUID()}`,
    event_name: "search_performed",
    schema_version: "1.0.0",
    occurred_at: occurredAt,
    source: input.search.source,
    environment,
    correlation_id: correlationId,
    actor: input.actor,
    session: input.session,
    payload: performedPayload,
  };

  const events: AnalyticsEventEnvelope[] = [performedEvent];

  if (input.result) {
    events.push({
      event_id: `evt_search_res_${randomUUID()}`,
      event_name: "search_result_returned",
      schema_version: "1.0.0",
      occurred_at: occurredAt,
      source: input.search.source,
      environment,
      correlation_id: correlationId,
      actor: input.actor,
      session: input.session,
      payload: buildSearchResultPayload(performedPayload.search_id, input.result),
    });
  }

  return {
    batch_id: input.batch_id ?? `batch_search_adapter_${randomUUID()}`,
    sent_at: input.sent_at ?? nowIso,
    events,
  };
}
