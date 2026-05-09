import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { revokeSocialImportSource } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

function resolveErrorStatus(code: string) {
  if (code === "SOCIAL_IMPORT_REASON_REQUIRED" || code === "SOCIAL_IMPORT_SOURCE_ID_INVALID") {
    return 400;
  }
  return 500;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireSocialImportPermission(request, "social_import.source.revoke");
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const sourceId = params.sourceId?.trim();
  if (!sourceId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant source invalide.",
      },
      400,
      auth.correlationId,
    );
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
    const mutation = await revokeSocialImportSource({
      sourceId,
      reason: parsed.data.reason,
      actorUid: auth.admin.uid,
    });

    if (!mutation) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Source social import introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.source.revoke",
      resource: "social_import_source",
      resourceId: sourceId,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        reason: parsed.data.reason,
        changed: mutation.changed,
      },
      diff: {
        beforeStatus: mutation.before.status,
        afterStatus: mutation.after.status,
      },
    });

    return jsonSuccess(
      {
        source: mutation.after,
        changed: mutation.changed,
      },
      auth.correlationId,
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_SOURCE_REVOKE_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message: "Impossible de révoquer la source.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
