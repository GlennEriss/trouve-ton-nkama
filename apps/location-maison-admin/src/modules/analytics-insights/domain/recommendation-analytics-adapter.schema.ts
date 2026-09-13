import { z } from "zod";

import {
  RECOMMENDATION_INTERACTION_EVENT_NAMES,
  analyticsEnvironmentSchema,
} from "@/modules/analytics-insights/domain/analytics-ingestion.schema";

const idSchema = z.string().trim().min(1).max(256);
const shortStringSchema = z.string().trim().min(1).max(128);

const actorSchema = z
  .object({
    actor_type: z.enum(["user", "admin", "system"]).optional(),
    actor_id: idSchema.optional(),
    is_authenticated: z.boolean().optional(),
  })
  .strict();

const sessionSchema = z
  .object({
    session_id: idSchema,
  })
  .strict();

const contextSchema = z.enum(["home", "search", "similar", "reel"]);
const deviceClassSchema = z.enum(["mobile", "desktop", "tablet", "unknown"]);

const candidateSchema = z
  .object({
    listing_id: idSchema,
    position: z.int().min(0).max(500),
  })
  .strict();

// Corps envoyé par apps/location-maison, POST /api/recommendations/requests. Une
// « requête de recommandation servie » (docs/recommendation-ml/architecture/DATABASE-ARCHITECTURE.md)
// — un seul event_name (recommendation_request_served) construit côté adaptateur.
export const recommendationRequestAdapterBodySchema = z
  .object({
    correlation_id: idSchema.optional(),
    occurred_at: z.string().trim().optional(),
    environment: analyticsEnvironmentSchema.optional(),
    actor: actorSchema.optional(),
    session: sessionSchema.optional(),
    recommendation_request_id: idSchema,
    context: contextSchema,
    ranking_variant: shortStringSchema,
    ranking_version: shortStringSchema,
    filters_json: z.record(z.string(), z.unknown()).optional(),
    candidates: z.array(candidateSchema).min(1).max(50),
  })
  .strict();

const recommendationInteractionEventNameSchema = z.enum(RECOMMENDATION_INTERACTION_EVENT_NAMES);

const recommendationInteractionSchema = z
  .object({
    event_id: idSchema,
    event_name: recommendationInteractionEventNameSchema,
    occurred_at: z.string().trim(),
    recommendation_request_id: idSchema,
    listing_id: idSchema,
    position: z.int().min(0).max(500).optional(),
    ranking_variant: shortStringSchema,
    ranking_version: shortStringSchema,
    query_id: z.string().trim().max(128).optional(),
    device_class: deviceClassSchema.optional(),
  })
  .strict();

// Corps envoyé par apps/location-maison, POST /api/recommendations/events. Chaque event a déjà
// été validé et dédoublonné côté location-maison (Redis) avant d'arriver ici.
export const recommendationEventsAdapterBodySchema = z
  .object({
    batch_id: idSchema.optional(),
    correlation_id: idSchema.optional(),
    sent_at: z.string().trim().optional(),
    environment: analyticsEnvironmentSchema.optional(),
    actor: actorSchema.optional(),
    session: sessionSchema.optional(),
    events: z.array(recommendationInteractionSchema).min(1).max(50),
  })
  .strict();

export type RecommendationRequestAdapterBody = z.infer<
  typeof recommendationRequestAdapterBodySchema
>;
export type RecommendationEventsAdapterBody = z.infer<
  typeof recommendationEventsAdapterBodySchema
>;
