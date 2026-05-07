import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { updateListing } from "@/modules/listing-management/application/listing-management.service";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

const bodySchema = z
  .object({
    status: z.enum(["FOR_RENT", "FOR_SALE"]),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

function requiresReasonForRole(roles: string[]) {
  return (
    roles.includes("moderation_admin") &&
    !roles.includes("super_admin") &&
    !roles.includes("operations_admin")
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!hasPermission(auth.admin.permissions, "listings.status.update")) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Permission manquante : listings.status.update",
      },
      403,
      auth.correlationId,
    );
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

  const reason = parsed.data.reason?.trim() || null;
  if (requiresReasonForRole(auth.admin.roles) && !reason) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Un motif est obligatoire pour ce changement de statut.",
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const mutation = await updateListing({
      propertyId,
      actorUid: auth.admin.uid,
      patch: {
        status: parsed.data.status,
      },
    });

    if (!mutation) {
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
      action: "listings.status.update",
      resource: "property",
      resourceId: propertyId,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        reason,
      },
      diff: {
        beforeStatus: mutation.before.status,
        afterStatus: mutation.after.status,
      },
    });

    return jsonSuccess({ listing: mutation.after }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour le statut de l'annonce.",
      },
      500,
      auth.correlationId,
    );
  }
}
