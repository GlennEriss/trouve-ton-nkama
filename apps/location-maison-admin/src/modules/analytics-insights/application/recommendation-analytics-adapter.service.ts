import { randomUUID } from "node:crypto";

import type {
  AnalyticsEnvironment,
  AnalyticsEventEnvelope,
} from "@/modules/analytics-insights/domain/analytics-ingestion.schema";
import type {
  RecommendationEventsAdapterBody,
  RecommendationRequestAdapterBody,
} from "@/modules/analytics-insights/domain/recommendation-analytics-adapter.schema";

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

export function buildRecommendationRequestAdapterBatch(input: RecommendationRequestAdapterBody) {
  const nowIso = new Date().toISOString();
  const occurredAt = input.occurred_at ?? nowIso;
  const environment = resolveEnvironment(input.environment);
  const correlationId = input.correlation_id ?? `corr_${randomUUID()}`;

  const event: AnalyticsEventEnvelope = {
    event_id: `evt_reco_req_${randomUUID()}`,
    event_name: "recommendation_request_served",
    schema_version: "1.0.0",
    occurred_at: occurredAt,
    source: "recommendation_engine",
    environment,
    correlation_id: correlationId,
    actor: input.actor,
    session: input.session,
    payload: {
      recommendation_request_id: input.recommendation_request_id,
      context: input.context,
      ranking_variant: input.ranking_variant,
      ranking_version: input.ranking_version,
      filters_json: input.filters_json,
      candidates: input.candidates,
    },
  };

  return {
    batch_id: `batch_reco_req_${randomUUID()}`,
    sent_at: nowIso,
    events: [event],
  };
}

export function buildRecommendationEventsAdapterBatch(input: RecommendationEventsAdapterBody) {
  const nowIso = new Date().toISOString();
  const environment = resolveEnvironment(input.environment);
  const correlationId = input.correlation_id ?? `corr_${randomUUID()}`;

  const events: AnalyticsEventEnvelope[] = input.events.map((item) => ({
    event_id: item.event_id,
    event_name: item.event_name,
    schema_version: "1.0.0",
    occurred_at: item.occurred_at,
    source: "recommendation_engine",
    environment,
    correlation_id: correlationId,
    actor: input.actor,
    session: input.session,
    payload: {
      recommendation_request_id: item.recommendation_request_id,
      listing_id: item.listing_id,
      position: item.position,
      ranking_variant: item.ranking_variant,
      ranking_version: item.ranking_version,
      query_id: item.query_id,
      device_class: item.device_class,
    },
  }));

  return {
    batch_id: input.batch_id ?? `batch_reco_evt_${randomUUID()}`,
    sent_at: input.sent_at ?? nowIso,
    events,
  };
}
