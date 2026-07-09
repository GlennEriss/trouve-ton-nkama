import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  createSocialImportSource,
  listSocialImportSources,
} from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().trim().min(1).optional(),
  announcerUid: z.string().trim().optional(),
  platform: z.enum(["all", "facebook", "instagram", "tiktok", "linkedin", "x"]).optional(),
  status: z.enum(["all", "active", "paused", "revoked"]).optional(),
  query: z.string().trim().optional(),
});

const bodySchema = z
  .object({
    announcerUid: z.string().trim().min(1),
    platform: z.enum(["facebook", "instagram", "tiktok", "linkedin", "x"]),
    sourceUrl: z.string().trim().min(1),
    sourceType: z.enum(["profile", "page", "group_user"]),
    status: z.enum(["active", "paused", "revoked"]).optional(),
    consent: z
      .object({
        grantedAt: z.string().trim().optional().nullable(),
        grantedBy: z.string().trim().max(255).optional().nullable(),
        proofRef: z.string().trim().max(2048).optional().nullable(),
        expiresAt: z.string().trim().optional().nullable(),
      })
      .optional(),
  })
  .strict();

function resolveErrorStatus(code: string) {
  if (
    code === "SOCIAL_IMPORT_SOURCE_ANNOUNCER_UID_REQUIRED" ||
    code === "SOCIAL_IMPORT_SOURCE_URL_REQUIRED" ||
    code === "SOCIAL_IMPORT_SOURCE_URL_INVALID" ||
    code === "SOCIAL_IMPORT_SOURCE_PLATFORM_INVALID" ||
    code === "SOCIAL_IMPORT_SOURCE_TYPE_INVALID" ||
    code === "SOCIAL_IMPORT_SOURCE_STATUS_INVALID" ||
    code.startsWith("SOCIAL_IMPORT_CONSENT_")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: NextRequest) {
  const auth = await requireSocialImportPermission(request, "social_import.source.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    announcerUid: request.nextUrl.searchParams.get("announcerUid") ?? undefined,
    platform: request.nextUrl.searchParams.get("platform") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Paramètres de requête invalides.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  const result = await listSocialImportSources({
    limit: parsed.data.limit ?? 100,
    cursor: parsed.data.cursor,
    announcerUid: parsed.data.announcerUid,
    platform: parsed.data.platform === "all" ? undefined : parsed.data.platform,
    status: parsed.data.status,
    query: parsed.data.query,
  });

  return jsonSuccess(result, auth.correlationId);
}

export async function POST(request: NextRequest) {
  const auth = await requireSocialImportPermission(request, "social_import.source.create");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
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
    const result = await createSocialImportSource({
      announcerUid: parsed.data.announcerUid,
      platform: parsed.data.platform,
      sourceUrl: parsed.data.sourceUrl,
      sourceType: parsed.data.sourceType,
      status: parsed.data.status,
      consent: parsed.data.consent,
      actorUid: auth.admin.uid,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "social_import.source.create",
      resource: "social_import_source",
      resourceId: result.source.id,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        platform: result.source.platform,
        sourceType: result.source.sourceType,
        status: result.source.status,
        announcerUid: result.source.announcerUid,
      },
      diff: {
        after: result.source,
      },
    });

    return jsonSuccess(result, auth.correlationId, 201);
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_SOURCE_CREATE_FAILED";
    const status = resolveErrorStatus(code);
    return jsonError(
      {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message:
          code === "SOCIAL_IMPORT_SOURCE_URL_INVALID"
            ? "URL source invalide."
            : code === "SOCIAL_IMPORT_CONSENT_PROOF_REQUIRED"
              ? "Le consentement nécessite grantedBy et proofRef."
              : "Impossible de créer la source social import.",
        details: {
          socialImportErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
