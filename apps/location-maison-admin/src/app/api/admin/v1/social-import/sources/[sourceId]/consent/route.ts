import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { updateSocialImportSourceConsent } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    grantedAt: z.string().trim().optional().nullable(),
    grantedBy: z.string().trim().max(255).optional().nullable(),
    proofRef: z.string().trim().max(2048).optional().nullable(),
    expiresAt: z.string().trim().optional().nullable(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Au moins un champ consentement doit être fourni.",
  });

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_SOURCE_ID_INVALID" ||
    code === "SOCIAL_IMPORT_CONSENT_PATCH_EMPTY" ||
    code === "SOCIAL_IMPORT_CONSENT_GRANTED_AT_INVALID" ||
    code === "SOCIAL_IMPORT_CONSENT_EXPIRES_AT_INVALID" ||
    code === "SOCIAL_IMPORT_CONSENT_PROOF_REQUIRED" ||
    code === "SOCIAL_IMPORT_CONSENT_DATE_RANGE_INVALID"
  ) {
    return 400;
  }
  return 500;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSocialImportPermission(request, "social_import.consent.manage");
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
    const mutation = await updateSocialImportSourceConsent({
      sourceId,
      consent: parsed.data,
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
      action: "social_import.consent.manage",
      resource: "social_import_source",
      resourceId: sourceId,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        beforeConsent: mutation.before.consent,
        afterConsent: mutation.after.consent,
      },
    });

    return jsonSuccess({ source: mutation.after }, auth.correlationId);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_CONSENT_UPDATE_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message:
          code === "SOCIAL_IMPORT_CONSENT_PROOF_REQUIRED"
            ? "Le consentement nécessite grantedBy et proofRef."
            : code === "SOCIAL_IMPORT_CONSENT_DATE_RANGE_INVALID"
              ? "expiresAt doit être supérieur ou égal à grantedAt."
              : "Impossible de mettre à jour le consentement.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
