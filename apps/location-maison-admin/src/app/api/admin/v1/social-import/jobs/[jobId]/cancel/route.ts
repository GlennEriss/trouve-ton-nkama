import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/api/types";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { cancelSocialImportJob } from "@/modules/social-import/application/social-import.service";
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
    code === "SOCIAL_IMPORT_JOB_CANCEL_STATUS_INVALID" ||
    code === "SOCIAL_IMPORT_JOB_CANCEL_PATCH_FAILED"
  ) {
    return 400;
  }
  if (code === "SOCIAL_IMPORT_JOB_NOT_FOUND") {
    return 404;
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

  try {
    const result = await cancelSocialImportJob({
      jobId,
      actorUid: auth.admin.uid,
      reason: parsed.data.reason,
      correlationId: auth.correlationId,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.job.cancel",
      resource: "social_import_job",
      resourceId: result.after.id,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        reason: parsed.data.reason ?? null,
        orchestratorCancel: result.orchestratorCancel,
      },
      diff: {
        beforeStatus: result.before.status,
        afterStatus: result.after.status,
      },
    });

    return jsonSuccess(result, auth.correlationId, 200);
  } catch (error) {
    const code = error instanceof Error ? error.message : "SOCIAL_IMPORT_JOB_CANCEL_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: resolveApiErrorCode(status),
        message:
          code === "SOCIAL_IMPORT_JOB_NOT_FOUND"
            ? "Job social import introuvable."
            : code === "SOCIAL_IMPORT_JOB_CANCEL_STATUS_INVALID"
              ? "Seuls les jobs en cours peuvent être annulés."
              : "Impossible d'annuler ce job.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}

