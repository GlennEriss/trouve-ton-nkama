import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { rejectSocialImportCandidate } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

type RouteContext = {
  params: Promise<{ candidateId: string }>;
};

function resolveErrorStatus(code: string) {
  if (code === "SOCIAL_IMPORT_CANDIDATE_ID_INVALID") {
    return 400;
  }
  return 500;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireSocialImportPermission(request, "social_import.reject");
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const candidateId = params.candidateId?.trim();
  if (!candidateId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant candidate invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const mutation = await rejectSocialImportCandidate({
      candidateId,
      actorUid: auth.admin.uid,
    });

    if (!mutation) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Candidate social import introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.reject",
      resource: "social_import_candidate",
      resourceId: candidateId,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        beforeStatus: mutation.before.status,
        afterStatus: mutation.after.status,
      },
    });

    return jsonSuccess({ candidate: mutation.after }, auth.correlationId);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_CANDIDATE_REJECT_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message: "Impossible de rejeter cette candidate.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
