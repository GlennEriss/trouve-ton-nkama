import { createHash, randomUUID } from "node:crypto";

import {
  analyticsEventEnvelopeSchema,
  type AnalyticsEventEnvelope,
  type AnalyticsIngestionBody,
  type PlatformVisitPayload,
  type PresenceHeartbeatPayload,
  type SearchPerformedPayload,
  type SearchResultReturnedPayload,
  type AnalyticsValidatedEvent,
  validateEventPayload,
} from "@/modules/analytics-insights/domain/analytics-ingestion.schema";
import type {
  AnalyticsIngestionHeaders,
  AnalyticsIngestionInput,
  AnalyticsIngestionPreparedData,
  AnalyticsIngestionSummary,
  AnalyticsRejectedEvent,
} from "@/modules/analytics-insights/domain/analytics-ingestion.types";
import {
  insertPresenceProjectionRows,
  insertRawAnalyticsEvents,
  insertRejectedAnalyticsEvents,
  insertSearchProjectionRows,
  insertTrafficProjectionRows,
  upsertIdempotencyRegistryRow,
  type PresenceProjectionRow,
  type RawAnalyticsEventRow,
  type RejectedAnalyticsEventRow,
  type SearchProjectionRow,
  type TrafficProjectionRow,
} from "@/modules/analytics-insights/infrastructure/analytics-bigquery.repository";
import {
  claimIngestionIdempotency,
  completeIngestionIdempotency,
  failIngestionIdempotency,
} from "@/modules/analytics-insights/infrastructure/analytics-idempotency.repository";

type IngestionResult =
  | {
      status: "accepted";
      summary: AnalyticsIngestionSummary;
    }
  | {
      status: "idempotency_conflict";
      message: string;
    }
  | {
      status: "idempotency_in_progress";
      message: string;
    };

type SearchPerformedEvent = AnalyticsValidatedEvent & {
  event_name: "search_performed";
  payload: SearchPerformedPayload;
};

type SearchResultReturnedEvent = AnalyticsValidatedEvent & {
  event_name: "search_result_returned";
  payload: SearchResultReturnedPayload;
};

type PresenceHeartbeatEvent = AnalyticsValidatedEvent & {
  event_name: "user_presence_heartbeat";
  payload: PresenceHeartbeatPayload;
};

type PlatformVisitEvent = AnalyticsValidatedEvent & {
  event_name: "platform_visit";
  payload: PlatformVisitPayload;
};

function normalizeIssuePath(path: PropertyKey[]): Array<string | number> {
  return path.map((segment) =>
    typeof segment === "number" ? segment : String(segment),
  );
}

function stableSortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableSortValue(item));
  }

  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    for (const [key, item] of entries) {
      if (item !== undefined) {
        sorted[key] = stableSortValue(item);
      }
    }
    return sorted;
  }

  return value;
}

export function buildAnalyticsPayloadFingerprint(input: {
  body: unknown;
  sourceHeader: string;
}) {
  const normalizedPayload = stableSortValue({
    sourceHeader: input.sourceHeader,
    body: input.body,
  });

  return createHash("sha256")
    .update(JSON.stringify(normalizedPayload))
    .digest("hex");
}

function normalizeQueryText(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

function buildRejection(
  event: unknown,
  reasonCode: string,
  reasonMessage: string,
  issues: Array<{ path: Array<string | number>; message: string }> = [],
): AnalyticsRejectedEvent {
  const asRecord =
    event && typeof event === "object" && !Array.isArray(event)
      ? (event as Record<string, unknown>)
      : null;

  return {
    eventId: typeof asRecord?.event_id === "string" ? asRecord.event_id : null,
    eventName: typeof asRecord?.event_name === "string" ? asRecord.event_name : null,
    source: typeof asRecord?.source === "string" ? asRecord.source : null,
    environment: typeof asRecord?.environment === "string" ? asRecord.environment : null,
    reasonCode,
    reasonMessage,
    issues,
    rawEvent: event,
  };
}

function isSearchPerformedEvent(event: AnalyticsValidatedEvent): event is SearchPerformedEvent {
  return event.event_name === "search_performed";
}

function isSearchResultReturnedEvent(
  event: AnalyticsValidatedEvent,
): event is SearchResultReturnedEvent {
  return event.event_name === "search_result_returned";
}

function isPresenceHeartbeatEvent(
  event: AnalyticsValidatedEvent,
): event is PresenceHeartbeatEvent {
  return event.event_name === "user_presence_heartbeat";
}

function isPlatformVisitEvent(event: AnalyticsValidatedEvent): event is PlatformVisitEvent {
  return event.event_name === "platform_visit";
}

function isSourceCompatible(
  sourceHeader: AnalyticsIngestionHeaders["sourceHeader"],
  event: AnalyticsEventEnvelope,
) {
  if (sourceHeader === "firebase") {
    return event.source === "firebase_analytics";
  }

  if (sourceHeader === "vercel") {
    return event.source === "vercel_analytics";
  }

  return (
    event.source === "catalog_search_page" ||
    event.source === "location_maison_search_bar" ||
    event.source === "search_with_ia_page"
  );
}

function prepareIngestionData(
  sourceHeader: AnalyticsIngestionHeaders["sourceHeader"],
  body: AnalyticsIngestionBody,
): AnalyticsIngestionPreparedData {
  const acceptedEvents: AnalyticsValidatedEvent[] = [];
  const rejectedEvents: AnalyticsRejectedEvent[] = [];
  const seenEventIds = new Set<string>();

  for (const rawEvent of body.events) {
    const parsedEnvelope = analyticsEventEnvelopeSchema.safeParse(rawEvent);

    if (!parsedEnvelope.success) {
      rejectedEvents.push(
        buildRejection(
          rawEvent,
          "ENVELOPE_VALIDATION_ERROR",
          "Envelope evenement invalide.",
          parsedEnvelope.error.issues.map((issue) => ({
            path: normalizeIssuePath(issue.path),
            message: issue.message,
          })),
        ),
      );
      continue;
    }

    const envelope = parsedEnvelope.data;

    if (seenEventIds.has(envelope.event_id)) {
      rejectedEvents.push(
        buildRejection(
          rawEvent,
          "DUPLICATE_EVENT_ID",
          "event_id duplique dans le batch.",
          [
            {
              path: ["event_id"],
              message: "event_id duplique dans le batch.",
            },
          ],
        ),
      );
      continue;
    }
    seenEventIds.add(envelope.event_id);

    if (!isSourceCompatible(sourceHeader, envelope)) {
      rejectedEvents.push(
        buildRejection(
          rawEvent,
          "SOURCE_HEADER_MISMATCH",
          "Incoherence entre X-Analytics-Source et source evenement.",
          [
            {
              path: ["source"],
              message: "Source incompatible avec X-Analytics-Source.",
            },
          ],
        ),
      );
      continue;
    }

    const payloadValidation = validateEventPayload(envelope);
    if (!payloadValidation.ok) {
      rejectedEvents.push(
        buildRejection(
          rawEvent,
          "PAYLOAD_VALIDATION_ERROR",
          "Payload evenement invalide.",
          payloadValidation.issues,
        ),
      );
      continue;
    }

    acceptedEvents.push({
      ...envelope,
      payload: payloadValidation.payload,
    });
  }

  return {
    acceptedEvents,
    rejectedEvents,
  };
}

function toRawAcceptedRows(input: {
  acceptedEvents: AnalyticsValidatedEvent[];
  receivedAt: string;
  batchId: string;
  idempotencyKey: string;
  payloadFingerprint: string;
  ingestedBy: string;
}): RawAnalyticsEventRow[] {
  return input.acceptedEvents.map((event) => ({
    event_id: event.event_id,
    event_name: event.event_name,
    schema_version: event.schema_version,
    occurred_at: event.occurred_at,
    received_at: input.receivedAt,
    source: event.source,
    environment: event.environment,
    correlation_id: event.correlation_id,
    actor_type: event.actor?.actor_type ?? null,
    actor_id: event.actor?.actor_id ?? null,
    is_authenticated: event.actor?.is_authenticated ?? null,
    session_id: event.session?.session_id ?? null,
    ip_hash: event.session?.ip_hash ?? null,
    user_agent_hash: event.session?.user_agent_hash ?? null,
    payload_json: toObject(event.payload),
    ingestion_status: "accepted",
    ingestion_error_code: null,
    ingestion_error_message: null,
    batch_id: input.batchId,
    idempotency_key: input.idempotencyKey,
    payload_fingerprint: input.payloadFingerprint,
    ingested_by: input.ingestedBy,
  }));
}

function toRawRejectedRows(input: {
  rejectedEvents: AnalyticsRejectedEvent[];
  receivedAt: string;
  batchId: string;
  idempotencyKey: string;
  payloadFingerprint: string;
  ingestedBy: string;
}): RawAnalyticsEventRow[] {
  return input.rejectedEvents
    .filter((item): item is AnalyticsRejectedEvent & { eventId: string } =>
      typeof item.eventId === "string" && item.eventId.length > 0,
    )
    .map((event) => ({
      event_id: event.eventId,
      event_name: event.eventName ?? "unknown_event",
      schema_version: "1.0.0",
      occurred_at: input.receivedAt,
      received_at: input.receivedAt,
      source: event.source ?? "unknown_source",
      environment: event.environment ?? "dev",
      correlation_id: "unknown_correlation",
      actor_type: null,
      actor_id: null,
      is_authenticated: null,
      session_id: null,
      ip_hash: null,
      user_agent_hash: null,
      payload_json: toObject(event.rawEvent),
      ingestion_status: "rejected",
      ingestion_error_code: event.reasonCode,
      ingestion_error_message: event.reasonMessage,
      batch_id: input.batchId,
      idempotency_key: input.idempotencyKey,
      payload_fingerprint: input.payloadFingerprint,
      ingested_by: input.ingestedBy,
    }));
}

function toRejectedRows(input: {
  rejectedEvents: AnalyticsRejectedEvent[];
  batchId: string;
  idempotencyKey: string;
  correlationId: string;
  rejectedAt: string;
}): RejectedAnalyticsEventRow[] {
  return input.rejectedEvents.map((event) => ({
    rejection_id: randomUUID(),
    event_id: event.eventId,
    event_name: event.eventName,
    source: event.source,
    environment: event.environment,
    rejection_reason_code: event.reasonCode,
    rejection_reason_message: event.reasonMessage,
    validation_issues_json: event.issues,
    raw_event_json: toObject(event.rawEvent),
    batch_id: input.batchId,
    idempotency_key: input.idempotencyKey,
    correlation_id: input.correlationId,
    rejected_at: input.rejectedAt,
  }));
}

function toSearchProjectionRows(acceptedEvents: AnalyticsValidatedEvent[]): SearchProjectionRow[] {
  const rows: SearchProjectionRow[] = [];

  for (const event of acceptedEvents) {
    if (isSearchPerformedEvent(event)) {
      const payload = event.payload;
      rows.push({
        search_id: payload.search_id,
        search_performed_event_id: event.event_id,
        search_result_event_id: null,
        source: event.source,
        occurred_at: event.occurred_at,
        query_text_raw: payload.query_text_raw ?? null,
        query_text_normalized:
          payload.query_text_normalized ?? normalizeQueryText(payload.query_text_raw),
        filters_json: payload.filters ? toObject(payload.filters) : null,
        page: payload.page ?? null,
        page_size: payload.page_size ?? null,
        results_count: null,
        has_results: null,
        result_ids_sample_json: null,
        execution_ms: null,
        engine: null,
        actor_id: event.actor?.actor_id ?? null,
        is_authenticated: event.actor?.is_authenticated ?? null,
        session_id: event.session?.session_id ?? null,
        correlation_id: event.correlation_id,
      });
      continue;
    }

    if (isSearchResultReturnedEvent(event)) {
      const payload = event.payload;
      rows.push({
        search_id: payload.search_id,
        search_performed_event_id: null,
        search_result_event_id: event.event_id,
        source: event.source,
        occurred_at: event.occurred_at,
        query_text_raw: null,
        query_text_normalized: null,
        filters_json: null,
        page: null,
        page_size: null,
        results_count: payload.results_count,
        has_results: payload.has_results,
        result_ids_sample_json: payload.result_ids_sample ?? null,
        execution_ms: payload.execution_ms ?? null,
        engine: payload.engine ?? null,
        actor_id: event.actor?.actor_id ?? null,
        is_authenticated: event.actor?.is_authenticated ?? null,
        session_id: event.session?.session_id ?? null,
        correlation_id: event.correlation_id,
      });
    }
  }

  return rows;
}

function toPresenceProjectionRows(
  acceptedEvents: AnalyticsValidatedEvent[],
): PresenceProjectionRow[] {
  const rows: PresenceProjectionRow[] = [];

  for (const event of acceptedEvents) {
    if (!isPresenceHeartbeatEvent(event)) {
      continue;
    }

    const payload = event.payload;
    rows.push({
      event_id: event.event_id,
      presence_subject: payload.presence_subject,
      subject_id: payload.subject_id,
      session_id: payload.session_id,
      status: payload.status,
      last_seen_at: payload.last_seen_at,
      device_type: payload.device_type ?? null,
      app_surface: payload.app_surface ?? null,
      source: event.source,
      occurred_at: event.occurred_at,
      correlation_id: event.correlation_id,
    });
  }

  return rows;
}

function toTrafficProjectionRows(acceptedEvents: AnalyticsValidatedEvent[]): TrafficProjectionRow[] {
  const rows: TrafficProjectionRow[] = [];

  for (const event of acceptedEvents) {
    if (!isPlatformVisitEvent(event)) {
      continue;
    }

    const payload = event.payload;
    rows.push({
      source: event.source,
      provider_event_id: payload.provider_event_id,
      metric_name: payload.metric_name,
      metric_value: payload.metric_value,
      page_path: payload.page_path ?? null,
      route: payload.route ?? null,
      referrer_host: payload.referrer_host ?? null,
      country: payload.country ?? null,
      device_category: payload.device_category ?? null,
      occurred_at: event.occurred_at,
      correlation_id: event.correlation_id,
    });
  }

  return rows;
}

export async function ingestAnalyticsEvents(
  input: AnalyticsIngestionInput,
): Promise<IngestionResult> {
  const claim = await claimIngestionIdempotency(
    input.headers.idempotencyKey,
    input.payloadFingerprint,
    input.headers.correlationId,
  );

  if (claim.status === "conflict") {
    return {
      status: "idempotency_conflict",
      message: "Idempotency-Key deja utilise avec un payload different.",
    };
  }

  if (claim.status === "in_progress") {
    return {
      status: "idempotency_in_progress",
      message: "Une requete identique est deja en cours.",
    };
  }

  if (claim.status === "replay") {
    return {
      status: "accepted",
      summary: claim.summary,
    };
  }

  const nowIso = new Date().toISOString();
  const prepared = prepareIngestionData(input.headers.sourceHeader, input.body);

  const rawAcceptedRows = toRawAcceptedRows({
    acceptedEvents: prepared.acceptedEvents,
    receivedAt: nowIso,
    batchId: input.body.batch_id,
    idempotencyKey: input.headers.idempotencyKey,
    payloadFingerprint: input.payloadFingerprint,
    ingestedBy: input.headers.ingestedBy,
  });

  const rawRejectedRows = toRawRejectedRows({
    rejectedEvents: prepared.rejectedEvents,
    receivedAt: nowIso,
    batchId: input.body.batch_id,
    idempotencyKey: input.headers.idempotencyKey,
    payloadFingerprint: input.payloadFingerprint,
    ingestedBy: input.headers.ingestedBy,
  });

  const rejectedRows = toRejectedRows({
    rejectedEvents: prepared.rejectedEvents,
    batchId: input.body.batch_id,
    idempotencyKey: input.headers.idempotencyKey,
    correlationId: input.headers.correlationId,
    rejectedAt: nowIso,
  });

  const searchRows = toSearchProjectionRows(prepared.acceptedEvents);
  const presenceRows = toPresenceProjectionRows(prepared.acceptedEvents);
  const trafficRows = toTrafficProjectionRows(prepared.acceptedEvents);

  try {
    const rawRows = [...rawAcceptedRows, ...rawRejectedRows];
    await insertRawAnalyticsEvents(rawRows);
    await insertRejectedAnalyticsEvents(rejectedRows);
    await insertSearchProjectionRows(searchRows);
    await insertPresenceProjectionRows(presenceRows);
    await insertTrafficProjectionRows(trafficRows);

    const summary: AnalyticsIngestionSummary = {
      batchId: input.body.batch_id,
      accepted: prepared.acceptedEvents.length,
      rejected: prepared.rejectedEvents.length,
      quarantined: 0,
      replayed: false,
    };

    await completeIngestionIdempotency(
      input.headers.idempotencyKey,
      input.headers.correlationId,
      summary,
    );

    await upsertIdempotencyRegistryRow({
      idempotency_key: input.headers.idempotencyKey,
      request_fingerprint: input.payloadFingerprint,
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      request_status: "completed",
      correlation_id: input.headers.correlationId,
    });

    return {
      status: "accepted",
      summary,
    };
  } catch (error) {
    await failIngestionIdempotency(
      input.headers.idempotencyKey,
      input.headers.correlationId,
      "INGESTION_WRITE_FAILED",
    );

    await upsertIdempotencyRegistryRow({
      idempotency_key: input.headers.idempotencyKey,
      request_fingerprint: input.payloadFingerprint,
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      request_status: "failed",
      correlation_id: input.headers.correlationId,
    }).catch(() => undefined);

    throw error;
  }
}
