import { z } from "zod";

import { analyticsEnvironmentSchema } from "@/modules/analytics-insights/domain/analytics-ingestion.schema";

const idSchema = z.string().trim().min(1).max(256);
const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoUtcDateTimeSchema = z
  .string()
  .trim()
  .refine((value) => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && value.endsWith("Z");
  }, "Datetime UTC invalide.");

const sourceSchema = z.enum([
  "catalog_search_page",
  "location_maison_search_bar",
  "search_with_ia_page",
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
  })
  .strict();

const adsenseReportRowSchema = z
  .object({
    report_date: isoDateSchema,
    dimension_page_url: z.string().trim().max(2048).optional(),
    dimension_ad_unit: z.string().trim().max(256).optional(),
    dimension_country: z.string().trim().regex(/^[A-Z]{2}$/).optional(),
    dimension_device: z.string().trim().max(64).optional(),
    estimated_earnings: z.number().min(0),
    page_views: z.number().int().min(0).default(0),
    ad_requests: z.number().int().min(0).default(0),
    matched_ad_requests: z.number().int().min(0).default(0),
    total_impressions: z.number().int().min(0).default(0),
    clicks: z.number().int().min(0).default(0),
    page_views_rpm: z.number().min(0).optional(),
    impressions_rpm: z.number().min(0).optional(),
    active_view_viewability: z.number().min(0).max(1000).optional(),
    active_view_measurability: z.number().min(0).max(1000).optional(),
    loaded_at: isoUtcDateTimeSchema.optional(),
  })
  .strict();

export const adsenseAnalyticsAdapterBodySchema = z
  .object({
    batch_id: idSchema.optional(),
    correlation_id: idSchema.optional(),
    sent_at: isoUtcDateTimeSchema.optional(),
    environment: analyticsEnvironmentSchema.optional(),
    account_id: z.string().trim().max(256).optional(),
    report_rows: z.array(adsenseReportRowSchema).min(1).max(5000),
  })
  .strict();

const adsSlotEventSchema = z
  .object({
    event_id: idSchema.optional(),
    event_name: z.enum([
      "ad_slot_rendered",
      "ad_request_sent",
      "ad_filled",
      "ad_impression",
      "ad_click",
    ]),
    occurred_at: isoUtcDateTimeSchema.optional(),
    page_path: z.string().trim().max(512).optional(),
    page_template: z.string().trim().max(100).optional(),
    slot_id: z.string().trim().min(1).max(256),
    slot_position: z.string().trim().max(64).optional(),
    latency_ms: z.number().int().min(0).max(120000).optional(),
    country: z.string().trim().regex(/^[A-Z]{2}$/).optional(),
    device_category: z.enum(["mobile", "desktop", "tablet", "unknown"]).optional(),
  })
  .strict();

export const adsSlotEventsAdapterBodySchema = z
  .object({
    batch_id: idSchema.optional(),
    correlation_id: idSchema.optional(),
    sent_at: isoUtcDateTimeSchema.optional(),
    occurred_at: isoUtcDateTimeSchema.optional(),
    environment: analyticsEnvironmentSchema.optional(),
    source: sourceSchema,
    actor: actorSchema.optional(),
    session: sessionSchema.optional(),
    events: z.array(adsSlotEventSchema).min(1).max(200),
  })
  .strict();

export type AdSenseAnalyticsAdapterBody = z.infer<typeof adsenseAnalyticsAdapterBodySchema>;
export type AdsSlotEventsAdapterBody = z.infer<typeof adsSlotEventsAdapterBodySchema>;
