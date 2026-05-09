import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/api/types";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { triggerSocialImportRun } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    sourceId: z.string().trim().min(1).optional(),
    announcerUid: z.string().trim().min(1).optional(),
    environment: z.enum(["dev", "preprod", "prod"]).optional(),
    reason: z.string().trim().max(500).optional(),
    dateFrom: z.string().trim().optional(),
    dateTo: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    includeImported: z.boolean().optional(),
    headless: z.boolean().optional(),
  })
  .strict();

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_ACTOR_UID_REQUIRED" ||
    code === "SOCIAL_IMPORT_RUN_SCOPE_REQUIRED" ||
    code === "SOCIAL_IMPORT_SOURCE_NOT_FOUND" ||
    code === "SOCIAL_IMPORT_SOURCE_ANNOUNCER_UID_REQUIRED" ||
    code === "SOCIAL_IMPORT_RUN_DATE_RANGE_INVALID" ||
    code === "SOCIAL_IMPORT_SCRAPER_ROOT_NOT_FOUND" ||
    code === "SOCIAL_IMPORT_REASON_REQUIRED" ||
    code === "SOCIAL_IMPORT_ORCHESTRATOR_URL_REQUIRED" ||
    code === "SOCIAL_IMPORT_ORCHESTRATOR_PROD_LOCAL_FORBIDDEN"
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
  const auth = await requireSocialImportPermission(request, "social_import.run.prod");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requete invalide.",
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
    const result = await triggerSocialImportRun({
      actorUid: auth.admin.uid,
      sourceId: parsed.data.sourceId,
      announcerUid: parsed.data.announcerUid,
      environment: parsed.data.environment,
      reason: parsed.data.reason,
      dateFrom: parsed.data.dateFrom,
      dateTo: parsed.data.dateTo,
      limit: parsed.data.limit,
      includeImported: parsed.data.includeImported,
      headless: parsed.data.headless,
      idempotencyKey,
      correlationId: auth.correlationId,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.run.prod",
      resource: "social_import_job",
      resourceId: result.job.id,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        replayed: result.replayed,
        dispatchMode: result.dispatch.mode,
        externalRunId: result.dispatch.externalRunId,
        environment: result.job.environment,
      },
      diff: {
        announcerScope: result.job.announcerScope,
      },
    });

    return jsonSuccess(result, auth.correlationId, 202);
  } catch (error) {
    const code = error instanceof Error ? error.message : "SOCIAL_IMPORT_RUN_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: resolveApiErrorCode(status),
        message:
          code === "SOCIAL_IMPORT_RUN_SCOPE_REQUIRED"
            ? "Fournis au minimum un sourceId ou un announcerUid."
            : code === "SOCIAL_IMPORT_SOURCE_NOT_FOUND"
              ? "Source social import introuvable."
              : code === "SOCIAL_IMPORT_RUN_DATE_RANGE_INVALID"
                ? "La date de debut doit etre inferieure a la date de fin."
                : code === "SOCIAL_IMPORT_REASON_REQUIRED"
                  ? "Le motif est obligatoire pour un run social import en production."
                  : code === "SOCIAL_IMPORT_ORCHESTRATOR_URL_REQUIRED"
                    ? "SOCIAL_IMPORT_ORCHESTRATOR_URL est requis pour le mode orchestrateur."
                    : code === "SOCIAL_IMPORT_ORCHESTRATOR_PROD_LOCAL_FORBIDDEN"
                      ? "Le mode local est interdit pour un run prod. Configure l'orchestrateur serveur."
                : code === "SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT"
                  ? "La cle d'idempotence est deja utilisee avec un payload different."
                : code === "SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS"
                  ? "Une requete de run identique est deja en cours."
                    : code === "SOCIAL_IMPORT_SCRAPER_ROOT_NOT_FOUND"
                      ? "Le dossier local du scraper est introuvable. Configure SOCIAL_IMPORT_SCRAPER_ROOT."
                      : "Impossible de lancer le run social import.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
