import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getSocialImportJobDetails } from "@/modules/social-import/application/social-import.service";
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

  const job = await getSocialImportJobDetails(jobId);
  if (!job) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Job social import introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  return jsonSuccess({ job }, auth.correlationId);
}
