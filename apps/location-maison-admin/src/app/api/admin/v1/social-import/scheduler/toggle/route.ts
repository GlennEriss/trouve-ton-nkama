import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { toggleSocialImportScheduler } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    enabled: z.boolean(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

function resolveErrorStatus(code: string) {
  if (code === "SOCIAL_IMPORT_REASON_REQUIRED") {
    return 400;
  }
  return 500;
}

export async function POST(request: NextRequest) {
  const auth = await requireSocialImportPermission(
    request,
    "social_import.scheduler.manage",
  );
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
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
    const mutation = await toggleSocialImportScheduler({
      actorUid: auth.admin.uid,
      enabled: parsed.data.enabled,
      reason: parsed.data.reason,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.scheduler.manage",
      resource: "social_import_scheduler",
      resourceId: "global",
      status: "success",
      correlationId: auth.correlationId,
      details: {
        reason: parsed.data.reason,
      },
      diff: {
        beforeEnabled: mutation.before,
        afterEnabled: mutation.after,
      },
    });

    return jsonSuccess({ scheduler: mutation }, auth.correlationId);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_SCHEDULER_TOGGLE_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message:
          code === "SOCIAL_IMPORT_REASON_REQUIRED"
            ? "Le motif est obligatoire pour activer/désactiver le scheduler."
            : "Impossible de modifier le scheduler social import.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
