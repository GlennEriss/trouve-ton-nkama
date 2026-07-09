import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/api/types";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { publishSocialImportCandidate } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ candidateId: string }>;
};

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_CANDIDATE_ID_INVALID" ||
    code === "SOCIAL_IMPORT_IDEMPOTENCY_KEY_REQUIRED" ||
    code === "SOCIAL_IMPORT_CANDIDATE_REJECTED" ||
    code === "SOCIAL_IMPORT_CANDIDATE_ALREADY_PUBLISHED" ||
    code === "SOCIAL_IMPORT_CANDIDATE_NOT_READY_TO_PUBLISH" ||
    code === "SOCIAL_IMPORT_CANDIDATE_LISTING_PAYLOAD_MISSING" ||
    code === "SOCIAL_IMPORT_CANDIDATE_LISTING_PAYLOAD_INVALID" ||
    code === "ANNOUNCER_NOT_FOUND" ||
    code === "ANNOUNCER_ROLE_REQUIRED"
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

export async function POST(request: NextRequest, context: RouteContext) {
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
  const parsed = bodySchema.safeParse(body ?? {});
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

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (!idempotencyKey) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Le header idempotency-key est obligatoire pour publier.",
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await publishSocialImportCandidate({
      candidateId,
      actorUid: auth.admin.uid,
      reason: parsed.data.reason,
      idempotencyKey,
      correlationId: auth.correlationId,
    });

    if (!result) {
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
      action: "social_import.publish",
      resource: "social_import_candidate",
      resourceId: candidateId,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        replayed: result.replayed,
      },
      diff: {
        candidateStatus: result.candidate.status,
      },
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_CANDIDATE_PUBLISH_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: resolveApiErrorCode(status),
        message:
          code === "SOCIAL_IMPORT_CANDIDATE_NOT_READY_TO_PUBLISH"
            ? "La candidate doit être en statut ready_to_publish."
            : code === "SOCIAL_IMPORT_CANDIDATE_ALREADY_PUBLISHED"
              ? "Cette candidate est déjà publiée."
              : code === "SOCIAL_IMPORT_CANDIDATE_REJECTED"
                ? "Impossible de publier une candidate rejetée."
                : code === "SOCIAL_IMPORT_CANDIDATE_LISTING_PAYLOAD_MISSING"
                  ? "Les données normalisées de l'annonce sont incomplètes pour la publication."
                  : code === "SOCIAL_IMPORT_CANDIDATE_LISTING_PAYLOAD_INVALID"
                    ? "Les données normalisées de l'annonce sont invalides pour property/add."
                    : code === "ANNOUNCER_NOT_FOUND"
                      ? "Annonceur introuvable pour cette candidate."
                      : code === "ANNOUNCER_ROLE_REQUIRED"
                        ? "Le compte cible doit avoir le rôle annonceur."
                : code === "SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT"
                  ? "La clé d'idempotence est déjà utilisée avec un payload différent."
                  : code === "SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS"
                    ? "Une requête publish identique est déjà en cours."
                    : "Impossible de publier cette candidate.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
