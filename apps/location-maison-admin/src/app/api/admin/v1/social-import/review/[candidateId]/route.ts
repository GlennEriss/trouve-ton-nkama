import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { deleteSocialImportCandidate } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

type RouteContext = {
  params: Promise<{ candidateId: string }>;
};

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_CANDIDATE_ID_INVALID" ||
    code === "SOCIAL_IMPORT_CANDIDATE_DELETE_FORBIDDEN_PUBLISHED"
  ) {
    return 400;
  }
  return 500;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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
    const mutation = await deleteSocialImportCandidate({
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
      action: "social_import.delete",
      resource: "social_import_candidate",
      resourceId: candidateId,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        rawJsonDeleted: mutation.rawJsonDeleted,
      },
      diff: {
        deletedStatus: mutation.candidate.status,
        rawPostId: mutation.candidate.rawPostId,
      },
    });

    return jsonSuccess(
      {
        deleted: true,
        candidateId,
        rawJsonDeleted: mutation.rawJsonDeleted,
      },
      auth.correlationId,
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_CANDIDATE_DELETE_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message:
          code === "SOCIAL_IMPORT_CANDIDATE_DELETE_FORBIDDEN_PUBLISHED"
            ? "Une candidate déjà publiée ne peut pas être supprimée depuis cette action."
            : "Impossible de supprimer cette candidate.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
