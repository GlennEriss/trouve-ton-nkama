import { Buffer } from "node:buffer";

import type { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { ingestAnalyticsEvents, buildAnalyticsPayloadFingerprint } from "@/modules/analytics-insights/application/analytics-ingestion.service";
import { analyticsIngestionBodySchema } from "@/modules/analytics-insights/domain/analytics-ingestion.schema";
import { requireAnalyticsIngestionAuth } from "@/modules/analytics-insights/presentation/analytics-ingestion-guard";

const MAX_BODY_BYTES = 1_000_000;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAnalyticsIngestionAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Content-Type doit etre application/json.",
      },
      415,
      auth.correlationId,
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Payload trop volumineux (max 1 MB).",
      },
      413,
      auth.correlationId,
    );
  }

  const rawBody = await request.text();
  const bodyBytes = Buffer.byteLength(rawBody, "utf8");
  if (bodyBytes > MAX_BODY_BYTES) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Payload trop volumineux (max 1 MB).",
      },
      413,
      auth.correlationId,
    );
  }

  let body: unknown = null;
  if (rawBody.length > 0) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonError(
        {
          code: "VALIDATION_ERROR",
          message: "JSON invalide.",
        },
        400,
        auth.correlationId,
      );
    }
  }

  const parsedBody = analyticsIngestionBodySchema.safeParse(body);

  if (!parsedBody.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requete invalide.",
        details: {
          issues: parsedBody.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

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
        ingestedBy: auth.ingestedBy,
      },
      body: parsedBody.data,
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
    const message =
      error instanceof Error ? error.message : "Echec interne d'ingestion analytics.";
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message,
      },
      500,
      auth.correlationId,
    );
  }
}
