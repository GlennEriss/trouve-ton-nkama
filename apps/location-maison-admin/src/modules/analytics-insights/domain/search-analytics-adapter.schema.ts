import { z } from "zod";

import { analyticsEnvironmentSchema } from "@/modules/analytics-insights/domain/analytics-ingestion.schema";

const idSchema = z.string().trim().min(1).max(256);

const primitiveQueryValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const queryValueSchema = z.union([
  primitiveQueryValueSchema,
  z.array(primitiveQueryValueSchema).max(100),
]);

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
    ip_hash: z.string().trim().regex(/^sha256:[a-f0-9]{16,128}$/i).optional(),
    user_agent_hash: z
      .string()
      .trim()
      .regex(/^sha256:[a-f0-9]{16,128}$/i)
      .optional(),
  })
  .strict();

const searchAdapterResultSchema = z
  .object({
    results_count: z.int().min(0).max(10000),
    result_ids_sample: z.array(idSchema).max(20).optional(),
    execution_ms: z.int().min(0).max(30000).optional(),
    engine: z.string().trim().max(64).optional(),
  })
  .strict();

const searchSourceSchema = z.enum([
  "catalog_search_page",
  "location_maison_search_bar",
  "search_with_ia_page",
]);

export const searchAnalyticsAdapterBodySchema = z
  .object({
    batch_id: idSchema.optional(),
    correlation_id: idSchema.optional(),
    sent_at: z.string().trim().optional(),
    occurred_at: z.string().trim().optional(),
    environment: analyticsEnvironmentSchema.optional(),
    actor: actorSchema.optional(),
    session: sessionSchema.optional(),
    search: z
      .object({
        source: searchSourceSchema,
        search_id: idSchema.optional(),
        query_text_raw: z.string().trim().max(160).optional(),
        query_params: z.record(z.string(), queryValueSchema).optional(),
        sort: z.string().trim().max(40).optional(),
        page: z.int().min(1).max(200).optional(),
        page_size: z.int().min(1).max(100).optional(),
      })
      .strict(),
    result: searchAdapterResultSchema.optional(),
  })
  .strict();

export type SearchAnalyticsAdapterBody = z.infer<
  typeof searchAnalyticsAdapterBodySchema
>;
