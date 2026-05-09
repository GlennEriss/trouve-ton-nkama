import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/api/types";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { triggerSocialImportDryRun } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    sourceIds: z.array(z.string().trim().min(1)).max(200).optional(),
    announcerUids: z.array(z.string().trim().min(1)).max(200).optional(),
    environment: z.enum(["dev", "preprod"]).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_ACTOR_UID_REQUIRED" ||
    code === "SOCIAL_IMPORT_DRY_RUN_SCOPE_REQUIRED" ||
    code === "SOCIAL_IMPORT_DRY_RUN_ENVIRONMENT_FORBIDDEN" ||
    code === "SOCIAL_IMPORT_SOURCE_NOT_FOUND"
  ) {
    return 400;
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

export async function POST(request: NextRequest) {
  const auth = await requireSocialImportPermission(request, "social_import.run.dry");
  if (!auth.ok) {
    return auth.response;
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

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || null;

  try {
    const result = await triggerSocialImportDryRun({
      actorUid: auth.admin.uid,
      sourceIds: parsed.data.sourceIds,
      announcerUids: parsed.data.announcerUids,
      environment: parsed.data.environment,
      reason: parsed.data.reason,
      idempotencyKey,
      correlationId: auth.correlationId,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.run.dry",
      resource: "social_import_job",
      resourceId: result.job.id,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        environment: result.job.environment,
        replayed: result.replayed,
        idempotencyKey: idempotencyKey ?? null,
      },
      diff: {
        jobId: result.job.id,
        announcerScope: result.job.announcerScope,
      },
    });

    return jsonSuccess(result, auth.correlationId, 201);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_DRY_RUN_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: resolveApiErrorCode(status),
        message:
          code === "SOCIAL_IMPORT_DRY_RUN_SCOPE_REQUIRED"
            ? "Fournis au moins un sourceId ou announcerUid."
            : code === "SOCIAL_IMPORT_SOURCE_NOT_FOUND"
              ? "Une des sources demandées est introuvable."
              : code === "SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT"
                ? "La clé d'idempotence est déjà utilisée avec un payload différent."
                : code === "SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS"
                  ? "Une requête dry-run identique est déjà en cours."
                  : "Impossible de lancer le dry-run social import.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
