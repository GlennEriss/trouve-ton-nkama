import { z } from "zod";

const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SHA256_HASH_REGEX = /^sha256:[a-f0-9]{16,128}$/i;

function isIsoUtcDateTime(value: string) {
  if (!ISO_UTC_REGEX.test(value)) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}

function isFutureBeyondDrift(value: string, maxDriftMs: number) {
  const timestamp = Date.parse(value);
  return timestamp > Date.now() + maxDriftMs;
}

function normalizeIssuePath(path: PropertyKey[]): Array<string | number> {
  return path.map((segment) =>
    typeof segment === "number" ? segment : String(segment),
  );
}

export const analyticsEventNameSchema = z.enum([
  "search_performed",
  "search_result_returned",
  "user_presence_heartbeat",
  "platform_visit",
]);

export const analyticsSourceSchema = z.enum([
  "catalog_search_page",
  "location_maison_search_bar",
  "search_with_ia_page",
  "firebase_analytics",
  "vercel_analytics",
]);

export const analyticsEnvironmentSchema = z.enum(["dev", "preprod", "prod"]);
export const analyticsIngestionSourceHeaderSchema = z.enum([
  "firebase",
  "vercel",
  "location-maison",
]);

const idSchema = z.string().trim().min(1).max(256);
const shortStringSchema = z.string().trim().min(1).max(128);

const isoUtcDateTimeSchema = z
  .string()
  .trim()
  .refine((value) => isIsoUtcDateTime(value), {
    message: "Format datetime UTC invalide.",
  });

const isoUtcDateTimeWithDriftSchema = isoUtcDateTimeSchema.refine(
  (value) => !isFutureBeyondDrift(value, 5 * 60 * 1000),
  {
    message: "occurred_at est dans le futur au-dela de la derive autorisee.",
  },
);

const propertyTypeSchema = z.enum([
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
]);

const propertyStatusSchema = z.enum(["FOR_RENT", "FOR_SALE"]);
const currencySchema = z.enum(["XOF", "EUR", "USD"]);
const presenceSubjectSchema = z.enum(["user", "admin"]);
const presenceStatusSchema = z.enum(["online", "offline"]);
const deviceTypeSchema = z.enum(["mobile", "desktop", "tablet", "unknown"]);
const appSurfaceSchema = z.enum(["web", "mobile_app"]);
const metricNameSchema = z.enum(["visit", "unique_visitor", "page_view"]);

export const analyticsIngestionBodySchema = z
  .object({
    batch_id: idSchema,
    sent_at: isoUtcDateTimeSchema,
    events: z.array(z.unknown()).min(1).max(500),
  })
  .strict();

const searchPerformedPayloadSchema = z
  .object({
    search_id: idSchema,
    query_text_raw: z.string().trim().max(160).optional(),
    query_text_normalized: z.string().trim().max(160).optional(),
    filters: z
      .object({
        property_types: z.array(propertyTypeSchema).max(10).optional(),
        province: z.string().trim().max(120).optional(),
        city: z.string().trim().max(120).optional(),
        street: z.string().trim().max(180).optional(),
        district: z.string().trim().max(180).optional(),
        price_min: z.int().min(0).optional(),
        price_max: z.int().min(0).optional(),
        min_area: z.int().min(0).optional(),
        max_area: z.int().min(0).optional(),
        min_nbr_rooms: z.int().min(0).optional(),
        max_nbr_rooms: z.int().min(0).optional(),
        status: propertyStatusSchema.optional(),
        tags: z.array(z.string().trim().min(1).max(64)).max(33).optional(),
        currency: currencySchema.optional(),
      })
      .strict()
      .optional(),
    sort: z.string().trim().max(40).optional(),
    page: z.int().min(1).max(200).optional(),
    page_size: z.int().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.filters?.price_min !== undefined &&
      value.filters?.price_max !== undefined &&
      value.filters.price_min > value.filters.price_max
    ) {
      ctx.addIssue({
        code: "custom",
        message: "price_min doit etre <= price_max.",
      });
    }

    const hasQuery = Boolean(value.query_text_raw && value.query_text_raw.length > 0);
    const hasFilters = Boolean(value.filters && Object.keys(value.filters).length > 0);

    if (!hasQuery && !hasFilters) {
      ctx.addIssue({
        code: "custom",
        message: "query_text_raw ou filters est requis.",
      });
    }
  });

const searchResultReturnedPayloadSchema = z
  .object({
    search_id: idSchema,
    results_count: z.int().min(0).max(10000),
    has_results: z.boolean(),
    result_ids_sample: z.array(idSchema).max(20).optional(),
    execution_ms: z.int().min(0).max(30000).optional(),
    engine: z.string().trim().max(64).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.has_results !== (value.results_count > 0)) {
      ctx.addIssue({
        code: "custom",
        message: "has_results doit correspondre a results_count.",
      });
    }

    if (!value.has_results && (value.result_ids_sample?.length ?? 0) > 0) {
      ctx.addIssue({
        code: "custom",
        message: "result_ids_sample doit etre vide quand has_results=false.",
      });
    }
  });

const presenceHeartbeatPayloadSchema = z
  .object({
    presence_subject: presenceSubjectSchema,
    subject_id: idSchema,
    session_id: idSchema,
    status: presenceStatusSchema,
    last_seen_at: isoUtcDateTimeSchema,
    device_type: deviceTypeSchema.optional(),
    app_surface: appSurfaceSchema.optional(),
  })
  .strict();

const platformVisitPayloadSchema = z
  .object({
    provider_event_id: z.string().trim().min(1).max(256),
    metric_name: metricNameSchema,
    metric_value: z.number().positive(),
    page_path: z.string().trim().max(512).nullish(),
    route: z.string().trim().max(512).nullish(),
    referrer_host: z.string().trim().max(255).nullish(),
    country: z.string().trim().regex(/^[A-Z]{2}$/).nullish(),
    device_category: deviceTypeSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.page_path && !value.page_path.startsWith("/")) {
      ctx.addIssue({
        code: "custom",
        message: "page_path doit commencer par '/'.",
      });
    }
  });

export const analyticsEventEnvelopeSchema = z
  .object({
    event_id: idSchema,
    event_name: analyticsEventNameSchema,
    schema_version: z.literal("1.0.0"),
    occurred_at: isoUtcDateTimeWithDriftSchema,
    source: analyticsSourceSchema,
    environment: analyticsEnvironmentSchema,
    correlation_id: shortStringSchema,
    actor: z
      .object({
        actor_type: z.enum(["user", "admin", "system"]).optional(),
        actor_id: idSchema.optional(),
        is_authenticated: z.boolean().optional(),
      })
      .strict()
      .optional(),
    session: z
      .object({
        session_id: idSchema,
        ip_hash: z.string().trim().regex(SHA256_HASH_REGEX).optional(),
        user_agent_hash: z.string().trim().regex(SHA256_HASH_REGEX).optional(),
      })
      .strict()
      .optional(),
    payload: z.unknown(),
  })
  .strict();

export type AnalyticsIngestionBody = z.infer<typeof analyticsIngestionBodySchema>;
export type AnalyticsEventEnvelope = z.infer<typeof analyticsEventEnvelopeSchema>;
export type AnalyticsEventName = z.infer<typeof analyticsEventNameSchema>;
export type AnalyticsSource = z.infer<typeof analyticsSourceSchema>;
export type AnalyticsEnvironment = z.infer<typeof analyticsEnvironmentSchema>;
export type AnalyticsIngestionSourceHeader = z.infer<
  typeof analyticsIngestionSourceHeaderSchema
>;
export type SearchPerformedPayload = z.infer<typeof searchPerformedPayloadSchema>;
export type SearchResultReturnedPayload = z.infer<typeof searchResultReturnedPayloadSchema>;
export type PresenceHeartbeatPayload = z.infer<typeof presenceHeartbeatPayloadSchema>;
export type PlatformVisitPayload = z.infer<typeof platformVisitPayloadSchema>;
export type AnalyticsValidationIssue = {
  path: Array<string | number>;
  message: string;
};

export type AnalyticsValidatedPayload =
  | SearchPerformedPayload
  | SearchResultReturnedPayload
  | PresenceHeartbeatPayload
  | PlatformVisitPayload;

export type AnalyticsValidatedEvent = Omit<AnalyticsEventEnvelope, "payload"> & {
  payload: AnalyticsValidatedPayload;
};

type ValidationSuccess = {
  ok: true;
  payload: AnalyticsValidatedPayload;
};

type ValidationFailure = {
  ok: false;
  issues: AnalyticsValidationIssue[];
};

export function validateEventPayload(
  event: AnalyticsEventEnvelope,
): ValidationSuccess | ValidationFailure {
  if (
    event.event_name === "search_performed" &&
    ![
      "catalog_search_page",
      "location_maison_search_bar",
      "search_with_ia_page",
    ].includes(event.source)
  ) {
    return {
      ok: false as const,
      issues: [
        {
          path: ["source"],
          message: "source invalide pour search_performed.",
        },
      ],
    };
  }

  if (
    event.event_name === "search_result_returned" &&
    ![
      "catalog_search_page",
      "location_maison_search_bar",
      "search_with_ia_page",
    ].includes(event.source)
  ) {
    return {
      ok: false as const,
      issues: [
        {
          path: ["source"],
          message: "source invalide pour search_result_returned.",
        },
      ],
    };
  }

  if (
    event.event_name === "platform_visit" &&
    !["firebase_analytics", "vercel_analytics"].includes(event.source)
  ) {
    return {
      ok: false as const,
      issues: [
        {
          path: ["source"],
          message: "source invalide pour platform_visit.",
        },
      ],
    };
  }

  if (event.event_name === "search_performed") {
    const parsed = searchPerformedPayloadSchema.safeParse(event.payload);
    return parsed.success
      ? { ok: true as const, payload: parsed.data }
      : {
          ok: false as const,
          issues: parsed.error.issues.map((issue) => ({
            path: normalizeIssuePath(issue.path),
            message: issue.message,
          })),
        };
  }

  if (event.event_name === "search_result_returned") {
    const parsed = searchResultReturnedPayloadSchema.safeParse(event.payload);
    return parsed.success
      ? { ok: true as const, payload: parsed.data }
      : {
          ok: false as const,
          issues: parsed.error.issues.map((issue) => ({
            path: normalizeIssuePath(issue.path),
            message: issue.message,
          })),
        };
  }

  if (event.event_name === "user_presence_heartbeat") {
    const parsed = presenceHeartbeatPayloadSchema.safeParse(event.payload);
    return parsed.success
      ? { ok: true as const, payload: parsed.data }
      : {
          ok: false as const,
          issues: parsed.error.issues.map((issue) => ({
            path: normalizeIssuePath(issue.path),
            message: issue.message,
          })),
        };
  }

  const parsed = platformVisitPayloadSchema.safeParse(event.payload);
  return parsed.success
    ? { ok: true as const, payload: parsed.data }
    : {
        ok: false as const,
        issues: parsed.error.issues.map((issue) => ({
          path: normalizeIssuePath(issue.path),
          message: issue.message,
        })),
      };
}
