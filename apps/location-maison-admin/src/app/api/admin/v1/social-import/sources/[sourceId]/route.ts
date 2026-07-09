import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { updateSocialImportSource } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    platform: z
      .enum(["facebook", "instagram", "tiktok", "linkedin", "x"])
      .optional(),
    sourceUrl: z.string().trim().min(1).optional(),
    sourceType: z.enum(["profile", "page", "group_user"]).optional(),
    status: z.enum(["active", "paused", "revoked"]).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Au moins un champ doit être fourni.",
  });

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_SOURCE_ID_INVALID" ||
    code === "SOCIAL_IMPORT_SOURCE_PATCH_EMPTY" ||
    code === "SOCIAL_IMPORT_SOURCE_URL_REQUIRED" ||
    code === "SOCIAL_IMPORT_SOURCE_URL_INVALID" ||
    code === "SOCIAL_IMPORT_SOURCE_PLATFORM_INVALID" ||
    code === "SOCIAL_IMPORT_SOURCE_TYPE_INVALID" ||
    code === "SOCIAL_IMPORT_SOURCE_STATUS_INVALID" ||
    code === "SOCIAL_IMPORT_SOURCE_STATUS_TRANSITION_FORBIDDEN"
  ) {
    return 400;
  }

  return 500;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSocialImportPermission(request, "social_import.source.update");
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
    const mutation = await updateSocialImportSource({
      sourceId,
      patch: parsed.data,
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
      action: "social_import.source.update",
      resource: "social_import_source",
      resourceId: sourceId,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        before: mutation.before,
        after: mutation.after,
      },
    });

    return jsonSuccess({ source: mutation.after }, auth.correlationId);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_SOURCE_UPDATE_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message:
          code === "SOCIAL_IMPORT_SOURCE_STATUS_TRANSITION_FORBIDDEN"
            ? "Transition de statut non autorisée."
            : "Impossible de mettre à jour la source social import.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
