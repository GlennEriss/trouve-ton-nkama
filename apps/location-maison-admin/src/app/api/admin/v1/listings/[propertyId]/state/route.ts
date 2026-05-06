import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { updateListingState } from "@/modules/listing-management/application/listing-management.service";

const bodySchema = z
  .object({
    state: z.enum(["IN_PROGRESS", "ARCHIVED"]),
  })
  .strict();

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const propertyId = params.propertyId?.trim();
  if (!propertyId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant annonce invalide.",
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

  const requiredPermission =
    parsed.data.state === "ARCHIVED" ? "listings.reject" : "listings.approve";

  if (!hasPermission(auth.admin.permissions, requiredPermission)) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: `Permission manquante : ${requiredPermission}`,
      },
      403,
      auth.correlationId,
    );
  }

  const updated = await updateListingState({
    propertyId,
    actorUid: auth.admin.uid,
    state: parsed.data.state,
  });

  if (!updated) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  await logAudit({
    actorId: auth.admin.uid,
    actorRoles: auth.admin.roles,
    action: requiredPermission,
    resource: "property",
    resourceId: propertyId,
    status: "success",
    correlationId: auth.correlationId,
    diff: {
      state: parsed.data.state,
    },
  });

  return jsonSuccess({ listing: updated }, auth.correlationId);
}
