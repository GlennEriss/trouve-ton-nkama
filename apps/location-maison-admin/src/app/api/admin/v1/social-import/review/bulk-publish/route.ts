import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { publishSocialImportCandidatesBulk } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    candidateIds: z.array(z.string().trim().min(1)).min(1).max(200),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_CANDIDATE_IDS_REQUIRED" ||
    code === "SOCIAL_IMPORT_CANDIDATE_IDS_LIMIT_EXCEEDED"
  ) {
    return 400;
  }
  return 500;
}

export async function POST(request: NextRequest) {
  const auth = await requireSocialImportPermission(request, "social_import.publish");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide pour la publication multiple.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await publishSocialImportCandidatesBulk({
      candidateIds: parsed.data.candidateIds,
      actorUid: auth.admin.uid,
      correlationId: auth.correlationId,
      reason: parsed.data.reason,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.publish.bulk",
      resource: "social_import_candidate",
      resourceId: `bulk:${result.requestedCount}`,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        requestedCount: result.requestedCount,
        publishedCount: result.publishedCount,
        skippedPublishedCount: result.skippedPublishedCount,
        skippedRejectedCount: result.skippedRejectedCount,
        skippedNotReadyCount: result.skippedNotReadyCount,
        failedCount: result.failedCount,
        notFoundCount: result.notFoundCount,
      },
      diff: {
        publishedIds: result.published.map((item) => item.candidateId),
      },
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_CANDIDATE_BULK_PUBLISH_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message: "Impossible de publier la sélection.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
