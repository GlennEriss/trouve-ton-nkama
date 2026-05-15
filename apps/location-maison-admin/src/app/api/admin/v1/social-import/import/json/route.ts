import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/api/types";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { importSocialPostsFromJson } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const bodySchema = z
  .object({
    announcerUid: z.string().trim().min(1),
    sourceId: z.string().trim().min(1).optional(),
    environment: z.enum(["dev", "preprod", "prod"]).optional(),
    reason: z.string().trim().max(500).optional(),
    resolveOriginalMedia: z.boolean().optional(),
    posts: z.array(z.record(z.string(), z.unknown())).min(1).max(1500),
  })
  .strict();

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_ACTOR_UID_REQUIRED" ||
    code === "SOCIAL_IMPORT_SOURCE_ANNOUNCER_UID_REQUIRED" ||
    code === "SOCIAL_IMPORT_JSON_POSTS_REQUIRED" ||
    code === "SOCIAL_IMPORT_JSON_POSTS_PARSE_EMPTY"
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
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
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
        message: "Corps de requête invalide pour import JSON.",
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
    const result = await importSocialPostsFromJson({
      actorUid: auth.admin.uid,
      announcerUid: parsed.data.announcerUid,
      sourceId: parsed.data.sourceId,
      environment: parsed.data.environment,
      reason: parsed.data.reason,
      resolveOriginalMedia: parsed.data.resolveOriginalMedia,
      posts: parsed.data.posts,
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
        importedCount: result.importedCount,
        environment: result.job.environment,
      },
      diff: {
        announcerUid: parsed.data.announcerUid,
        postsSubmitted: parsed.data.posts.length,
      },
    });

    return jsonSuccess(result, auth.correlationId, 201);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_JSON_IMPORT_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: resolveApiErrorCode(status),
        message:
          code === "SOCIAL_IMPORT_JSON_POSTS_REQUIRED"
            ? "Fournis un tableau posts non vide."
            : code === "SOCIAL_IMPORT_JSON_POSTS_PARSE_EMPTY"
              ? "Le JSON est valide mais aucun post exploitable n'a été détecté."
              : code === "SOCIAL_IMPORT_STORAGE_BUCKET_NOT_CONFIGURED"
                ? "Bucket Firebase Storage non configuré côté admin. Vérifie FIREBASE_STORAGE_BUCKET/NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET."
              : code === "SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT"
                ? "La clé d'idempotence est déjà utilisée avec un payload différent."
                : code === "SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS"
                  ? "Une requête d'import JSON identique est déjà en cours."
                  : "Impossible d'importer les posts JSON.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
