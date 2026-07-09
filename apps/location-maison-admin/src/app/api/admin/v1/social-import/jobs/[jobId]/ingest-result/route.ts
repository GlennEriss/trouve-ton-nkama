import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { ingestSocialImportJobResult } from "@/modules/social-import/application/social-import.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

const candidateSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    jobId: z.string().trim().min(1).optional(),
    announcerUid: z.string().trim().min(1).optional(),
    sourceId: z.string().trim().min(1).nullable().optional(),
    rawPostId: z.string().trim().min(1),
    sourcePostUrl: z.string().trim().min(1).nullable().optional(),
    title: z.string().trim().max(500).nullable().optional(),
    typeProperty: z.string().trim().max(120).nullable().optional(),
    price: z.coerce.number().finite().nullable().optional(),
    city: z.string().trim().max(200).nullable().optional(),
    province: z.string().trim().max(200).nullable().optional(),
    imageUrls: z.array(z.string().trim().min(1)).optional(),
    status: z
      .enum(["ready_to_publish", "needs_review", "rejected", "published"])
      .optional(),
    autoReason: z.string().trim().max(2000).nullable().optional(),
    score: z.coerce.number().finite().nullable().optional(),
    payload: z.record(z.string(), z.unknown()).nullable().optional(),
    listing: z.record(z.string(), z.unknown()).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

const bodySchema = z
  .object({
    jobId: z.string().trim().min(1).optional(),
    status: z.enum(["running", "completed", "failed", "partial", "needs_review"]).optional(),
    errorSummary: z.string().trim().max(4000).nullable().optional(),
    counters: z
      .object({
        rawFetched: z.coerce.number().finite().optional(),
        normalizedOk: z.coerce.number().finite().optional(),
        needsReview: z.coerce.number().finite().optional(),
        published: z.coerce.number().finite().optional(),
        rejected: z.coerce.number().finite().optional(),
      })
      .partial()
      .nullable()
      .optional(),
    candidates: z.array(candidateSchema).max(5000).optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

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

function resolveExpectedToken() {
  return (
    process.env.SOCIAL_IMPORT_INGEST_TOKEN?.trim() ||
    process.env.SOCIAL_IMPORT_ADMIN_CALLBACK_TOKEN?.trim() ||
    process.env.ANALYTICS_INGEST_TOKEN?.trim() ||
    ""
  );
}

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_JOB_ID_INVALID" ||
    code === "SOCIAL_IMPORT_JOB_RESULT_INVALID"
  ) {
    return 400;
  }
  if (code === "SOCIAL_IMPORT_JOB_NOT_FOUND") {
    return 404;
  }
  return 500;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const jobId = params.jobId?.trim();
  const correlationId =
    request.headers.get("x-correlation-id")?.trim() ||
    `social_import_cb_${Date.now()}`;

  if (!jobId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant job invalide.",
      },
      400,
      correlationId,
    );
  }

  const expectedToken = resolveExpectedToken();
  if (!expectedToken) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          "Configuration manquante: definir SOCIAL_IMPORT_INGEST_TOKEN (ou SOCIAL_IMPORT_ADMIN_CALLBACK_TOKEN).",
      },
      500,
      correlationId,
    );
  }

  const providedToken =
    parseBearerToken(request.headers.get("authorization")) ||
    request.headers.get("x-social-import-ingest-token")?.trim() ||
    request.headers.get("x-social-import-callback-token")?.trim() ||
    null;

  if (!providedToken || providedToken !== expectedToken) {
    return jsonError(
      {
        code: "UNAUTHENTICATED",
        message: "Token callback social-import invalide ou absent.",
      },
      401,
      correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(body ?? {});
  if (!parsedBody.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps callback social-import invalide.",
        details: {
          issues: parsedBody.error.issues,
        },
      },
      400,
      correlationId,
    );
  }

  if (parsedBody.data.jobId && parsedBody.data.jobId.trim() !== jobId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "jobId payload ne correspond pas au jobId de la route.",
      },
      400,
      correlationId,
    );
  }

  try {
    const normalizedCandidates = (parsedBody.data.candidates ?? []).map((candidate) => ({
      ...candidate,
      id: candidate.id?.trim() || candidate.rawPostId,
    }));

    const result = await ingestSocialImportJobResult({
      jobId,
      status: parsedBody.data.status ?? null,
      errorSummary: parsedBody.data.errorSummary ?? null,
      counters: parsedBody.data.counters ?? null,
      candidates: normalizedCandidates,
      metadata: {
        ...(parsedBody.data.metadata ?? {}),
        callbackReceivedAt: new Date().toISOString(),
        callbackSource: "social_import_worker",
      },
    });

    return jsonSuccess(
      {
        jobId,
        status: result.after.status,
        acceptedCandidates: result.acceptedCandidates,
        reviewSync: result.reviewSync,
      },
      correlationId,
      202,
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "SOCIAL_IMPORT_JOB_RESULT_INGEST_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 404 ? "NOT_FOUND" : status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message:
          status === 404
            ? "Job social-import introuvable."
            : status === 400
              ? "Payload callback invalide."
              : "Impossible d'ingérer le résultat du run social-import.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      correlationId,
    );
  }
}
