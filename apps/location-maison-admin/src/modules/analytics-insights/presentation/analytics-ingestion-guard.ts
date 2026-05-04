import type { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api/response";
import { analyticsIngestionSourceHeaderSchema } from "@/modules/analytics-insights/domain/analytics-ingestion.schema";

const shortIdSchema = z.string().trim().min(1).max(128);
const idempotencyKeySchema = z.string().trim().min(1).max(256);

type GuardSuccess = {
  ok: true;
  correlationId: string;
  idempotencyKey: string;
  sourceHeader: z.infer<typeof analyticsIngestionSourceHeaderSchema>;
  ingestedBy: string;
};

type GuardFailure = {
  ok: false;
  response: ReturnType<typeof jsonError>;
};

function parseBearerToken(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  const normalized = headerValue.trim();
  if (!normalized.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = normalized.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function requireAnalyticsIngestionAuth(
  request: NextRequest,
): Promise<GuardSuccess | GuardFailure> {
  const correlationRaw = request.headers.get("x-correlation-id");
  const correlationParsed = shortIdSchema.safeParse(correlationRaw ?? "");

  if (!correlationParsed.success) {
    return {
      ok: false,
      response: jsonError(
        {
          code: "VALIDATION_ERROR",
          message: "Header X-Correlation-Id invalide.",
        },
        400,
      ),
    };
  }

  const correlationId = correlationParsed.data;

  const idempotencyRaw = request.headers.get("idempotency-key");
  const idempotencyParsed = idempotencyKeySchema.safeParse(idempotencyRaw ?? "");

  if (!idempotencyParsed.success) {
    return {
      ok: false,
      response: jsonError(
        {
          code: "VALIDATION_ERROR",
          message: "Header Idempotency-Key invalide.",
        },
        400,
        correlationId,
      ),
    };
  }

  const sourceRaw = request.headers.get("x-analytics-source");
  const sourceParsed = analyticsIngestionSourceHeaderSchema.safeParse(sourceRaw ?? "");

  if (!sourceParsed.success) {
    return {
      ok: false,
      response: jsonError(
        {
          code: "VALIDATION_ERROR",
          message: "Header X-Analytics-Source invalide.",
        },
        400,
        correlationId,
      ),
    };
  }

  const expectedToken = process.env.ANALYTICS_INGEST_TOKEN?.trim();
  if (!expectedToken) {
    return {
      ok: false,
      response: jsonError(
        {
          code: "INTERNAL_ERROR",
          message:
            "Configuration manquante: ANALYTICS_INGEST_TOKEN doit etre defini.",
        },
        500,
        correlationId,
      ),
    };
  }

  const bearerToken = parseBearerToken(request.headers.get("authorization"));
  const fallbackToken = request.headers.get("x-analytics-ingest-token")?.trim() || null;
  const providedToken = bearerToken ?? fallbackToken;

  if (!providedToken || providedToken !== expectedToken) {
    return {
      ok: false,
      response: jsonError(
        {
          code: "UNAUTHENTICATED",
          message: "Token service-to-service invalide ou absent.",
        },
        401,
        correlationId,
      ),
    };
  }

  return {
    ok: true,
    correlationId,
    idempotencyKey: idempotencyParsed.data,
    sourceHeader: sourceParsed.data,
    ingestedBy: `s2s:${sourceParsed.data}`,
  };
}
