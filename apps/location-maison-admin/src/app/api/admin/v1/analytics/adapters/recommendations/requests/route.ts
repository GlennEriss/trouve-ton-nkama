import type { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  buildAnalyticsPayloadFingerprint,
  ingestAnalyticsEvents,
} from "@/modules/analytics-insights/application/analytics-ingestion.service";
import { buildRecommendationRequestAdapterBatch } from "@/modules/analytics-insights/application/recommendation-analytics-adapter.service";
import { recommendationRequestAdapterBodySchema } from "@/modules/analytics-insights/domain/recommendation-analytics-adapter.schema";
import { requireAnalyticsIngestionAuth } from "@/modules/analytics-insights/presentation/analytics-ingestion-guard";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAnalyticsIngestionAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  if (auth.sourceHeader !== "location-maison") {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Cet adaptateur accepte uniquement X-Analytics-Source=location-maison.",
      },
      403,
      auth.correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = recommendationRequestAdapterBodySchema.safeParse(body);

  if (!parsedBody.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requete adaptateur recommendations/requests invalide.",
        details: {
          issues: parsedBody.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  const canonicalBatch = buildRecommendationRequestAdapterBatch(parsedBody.data);

  const payloadFingerprint = buildAnalyticsPayloadFingerprint({
    body: parsedBody.data,
    sourceHeader: auth.sourceHeader,
  });

  try {
    const result = await ingestAnalyticsEvents({
      headers: {
        correlationId: auth.correlationId,
        idempotencyKey: auth.idempotencyKey,
        sourceHeader: auth.sourceHeader,
        ingestedBy: `${auth.ingestedBy}:recommendation-request-adapter`,
      },
      body: canonicalBatch,
      payloadFingerprint,
    });

    if (result.status === "idempotency_conflict") {
      return jsonError(
        {
          code: "CONFLICT",
          message: result.message,
        },
        409,
        auth.correlationId,
      );
    }

    if (result.status === "idempotency_in_progress") {
      return jsonError(
        {
          code: "CONFLICT",
          message: result.message,
        },
        409,
        auth.correlationId,
      );
    }

    const response = jsonSuccess(
      {
        batch_id: result.summary.batchId,
        accepted: result.summary.accepted,
        rejected: result.summary.rejected,
        quarantined: result.summary.quarantined,
        replayed: result.summary.replayed,
      },
      auth.correlationId,
      202,
    );
    response.headers.set(
      "x-idempotent-replay",
      result.summary.replayed ? "true" : "false",
    );
    return response;
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Echec interne de l'adaptateur recommendations/requests.",
      },
      500,
      auth.correlationId,
    );
  }
}
