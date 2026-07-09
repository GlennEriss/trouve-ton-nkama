import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  getAnnouncerDetails,
  type AnnouncerSocialProfilesInput,
  updateAnnouncerSocialProfiles,
} from "@/modules/announcer-management/application/announcer-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type RouteContext = {
  params: Promise<{ uid: string }>;
};

const socialNetworkSchema = z
  .object({
    url: z.string().trim().max(300).optional(),
    handle: z.string().trim().max(120).optional(),
  })
  .strict();

const bodySchema = z
  .object({
    socialProfiles: z
      .object({
        facebook: z.union([socialNetworkSchema, z.null()]).optional(),
        instagram: z.union([socialNetworkSchema, z.null()]).optional(),
        tiktok: z.union([socialNetworkSchema, z.null()]).optional(),
        linkedin: z.union([socialNetworkSchema, z.null()]).optional(),
        x: z.union([socialNetworkSchema, z.null()]).optional(),
      })
      .strict(),
  })
  .strict();

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "announcers.read");

  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const uid = params.uid?.trim();

  if (!uid) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant annonceur invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const announcer = await getAnnouncerDetails(uid);
  if (!announcer) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Annonceur introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  return jsonSuccess({ announcer }, auth.correlationId);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "announcers.update");

  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const uid = params.uid?.trim();

  if (!uid) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant annonceur invalide.",
      },
      400,
      auth.correlationId,
    );
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

  const before = await getAnnouncerDetails(uid);
  if (!before) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Annonceur introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  const updated = await updateAnnouncerSocialProfiles({
    uid,
    socialProfiles: parsed.data.socialProfiles as AnnouncerSocialProfilesInput,
  });

  if (!updated) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Annonceur introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  await logAudit({
    actorId: auth.admin.uid,
    actorRoles: auth.admin.roles,
    action: "announcers.update_social_profiles",
    resource: "announcer",
    resourceId: uid,
    status: "success",
    correlationId: auth.correlationId,
    diff: {
      before: {
        socialProfiles: before.socialProfiles,
      },
      after: {
        socialProfiles: updated.socialProfiles,
      },
    },
  });

  return jsonSuccess({ announcer: updated }, auth.correlationId);
}
