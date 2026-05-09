import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  getSocialImportSettings,
  updateSocialImportSettings,
} from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const patchSchema = z
  .object({
    thresholds: z
      .object({
        autoPublishMinScore: z.coerce.number().min(0).max(1).optional(),
        autoRejectMaxScore: z.coerce.number().min(0).max(1).optional(),
        defaultRunLimit: z.coerce.number().int().min(1).max(20000).optional(),
        maxRunLimit: z.coerce.number().int().min(1).max(20000).optional(),
      })
      .strict()
      .optional(),
    scheduler: z
      .object({
        enabled: z.boolean().optional(),
        cronExpression: z.string().trim().min(5).max(120).optional(),
        timezone: z.string().trim().min(1).max(120).optional(),
        environment: z.enum(["dev", "preprod", "prod"]).optional(),
        includeImported: z.boolean().optional(),
        headless: z.boolean().optional(),
        defaultReason: z.string().trim().max(500).optional(),
      })
      .strict()
      .optional(),
    orchestrator: z
      .object({
        executionMode: z.enum(["auto", "orchestrator", "local"]).optional(),
        allowLocalProd: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_SETTINGS_PATCH_EMPTY" ||
    code === "SOCIAL_IMPORT_SETTINGS_THRESHOLDS_INVALID" ||
    code === "SOCIAL_IMPORT_SCHEDULER_CRON_INVALID" ||
    code === "SOCIAL_IMPORT_SCHEDULER_TIMEZONE_INVALID" ||
    code === "SOCIAL_IMPORT_ORCHESTRATOR_MODE_INVALID"
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: NextRequest) {
  const auth = await requireSocialImportPermission(
    request,
    "social_import.settings.read",
  );
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const settings = await getSocialImportSettings();
    return jsonSuccess({ settings }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les paramètres social import.",
      },
      500,
      auth.correlationId,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSocialImportPermission(
    request,
    "social_import.settings.update",
  );
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
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
    const settings = await updateSocialImportSettings({
      actorUid: auth.admin.uid,
      patch: parsed.data,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.settings.update",
      resource: "social_import_settings",
      resourceId: "global",
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        settings,
      },
    });

    return jsonSuccess({ settings }, auth.correlationId);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_SETTINGS_UPDATE_FAILED";
    const status = resolveErrorStatus(code);

    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message:
          code === "SOCIAL_IMPORT_SETTINGS_PATCH_EMPTY"
            ? "Aucun champ à mettre à jour."
            : code === "SOCIAL_IMPORT_SETTINGS_THRESHOLDS_INVALID"
              ? "Configuration des seuils invalide."
              : code === "SOCIAL_IMPORT_SCHEDULER_CRON_INVALID"
                ? "Expression cron invalide."
                : code === "SOCIAL_IMPORT_SCHEDULER_TIMEZONE_INVALID"
                  ? "Fuseau horaire invalide."
                  : code === "SOCIAL_IMPORT_ORCHESTRATOR_MODE_INVALID"
                    ? "Mode orchestrateur invalide."
                    : "Impossible de mettre à jour les paramètres social import.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
