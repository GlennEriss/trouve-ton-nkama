import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getSocialImportJobLogs } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireSocialImportPermission(request, "social_import.job.read");
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

  try {
    const payload = await getSocialImportJobLogs({ jobId });
    return jsonSuccess(payload, auth.correlationId);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_JOB_LOGS_READ_FAILED";
    return jsonError(
      {
        code: code === "SOCIAL_IMPORT_JOB_NOT_FOUND" ? "NOT_FOUND" : "INTERNAL_ERROR",
        message:
          code === "SOCIAL_IMPORT_JOB_NOT_FOUND"
            ? "Job social import introuvable."
            : "Impossible de lire les logs de ce job.",
        details: {
          socialImportErrorCode: code,
        },
      },
      code === "SOCIAL_IMPORT_JOB_NOT_FOUND" ? 404 : 500,
      auth.correlationId,
    );
  }
}

