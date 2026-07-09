import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  deleteSocialImportCandidate,
  updateSocialImportCandidateMapping,
} from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

type RouteContext = {
  params: Promise<{ candidateId: string }>;
};

const updateCandidateBodySchema = z
  .object({
    typeProperty: z.string().trim().min(1).max(40),
  })
  .strict();

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_CANDIDATE_ID_INVALID" ||
    code === "SOCIAL_IMPORT_CANDIDATE_DELETE_FORBIDDEN_PUBLISHED" ||
    code === "SOCIAL_IMPORT_CANDIDATE_PATCH_EMPTY" ||
    code === "SOCIAL_IMPORT_CANDIDATE_TYPE_INVALID" ||
    code === "SOCIAL_IMPORT_CANDIDATE_EDIT_FORBIDDEN_PUBLISHED"
  ) {
    return 400;
  }
  return 500;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSocialImportPermission(request, "social_import.publish");
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

  const body = await request.json().catch(() => null);
  const parsed = updateCandidateBodySchema.safeParse(body ?? {});
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
    const mutation = await updateSocialImportCandidateMapping({
      candidateId,
      actorUid: auth.admin.uid,
      patch: {
        typeProperty: parsed.data.typeProperty,
      },
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
      action: "social_import.update_candidate",
      resource: "social_import_candidate",
      resourceId: candidateId,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        previousType: mutation.before.typeProperty,
        nextType: mutation.after.typeProperty,
        previousStatus: mutation.before.status,
        nextStatus: mutation.after.status,
      },
    });

    return jsonSuccess(
      {
        before: mutation.before,
        after: mutation.after,
      },
      auth.correlationId,
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_CANDIDATE_PATCH_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message:
          code === "SOCIAL_IMPORT_CANDIDATE_TYPE_INVALID"
            ? "Le type d'annonce demandé est invalide."
            : code === "SOCIAL_IMPORT_CANDIDATE_EDIT_FORBIDDEN_PUBLISHED"
              ? "Une candidate déjà publiée ne peut plus être modifiée."
              : "Impossible de mettre à jour cette candidate.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
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
