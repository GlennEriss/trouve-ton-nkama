import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/api/types";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { retrySocialImportJob } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_JOB_ID_INVALID" ||
    code === "SOCIAL_IMPORT_ACTOR_UID_REQUIRED" ||
    code === "SOCIAL_IMPORT_JOB_RETRY_STATUS_INVALID" ||
    code === "SOCIAL_IMPORT_IDEMPOTENCY_KEY_REQUIRED"
  ) {
    return 400;
  }
  if (code === "SOCIAL_IMPORT_JOB_NOT_FOUND") {
    return 404;
  }
  if (
    code === "SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT" ||
    code === "SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS"
  ) {
    return 409;
  }
  return 500;
}

function resolveApiErrorCode(status: number): ApiErrorCode {
  if (status === 400) {
    return "VALIDATION_ERROR";
  }
  if (status === 404) {
    return "NOT_FOUND";
  }
  if (status === 409) {
    return "CONFLICT";
  }
  return "INTERNAL_ERROR";
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireSocialImportPermission(request, "social_import.job.retry");
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const jobId = params.jobId?.trim();
  if (!jobId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant job invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (!idempotencyKey) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Le header idempotency-key est obligatoire pour un retry job.",
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await retrySocialImportJob({
      jobId,
      actorUid: auth.admin.uid,
      reason: parsed.data.reason,
      idempotencyKey,
      correlationId: auth.correlationId,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.job.retry",
      resource: "social_import_job",
      resourceId: result.job.id,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        previousJobId: result.previousJob.id,
        previousStatus: result.previousJob.status,
        replayed: result.replayed,
      },
      diff: {
        retryJobId: result.job.id,
      },
    });

    return jsonSuccess(result, auth.correlationId, 201);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_JOB_RETRY_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: resolveApiErrorCode(status),
        message:
          code === "SOCIAL_IMPORT_JOB_NOT_FOUND"
            ? "Job social import introuvable."
            : code === "SOCIAL_IMPORT_JOB_RETRY_STATUS_INVALID"
              ? "Le statut actuel du job ne permet pas un retry."
              : code === "SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT"
                ? "La clé d'idempotence est déjà utilisée avec un payload différent."
                : code === "SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS"
                  ? "Une requête retry identique est déjà en cours."
                  : "Impossible de relancer ce job.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
