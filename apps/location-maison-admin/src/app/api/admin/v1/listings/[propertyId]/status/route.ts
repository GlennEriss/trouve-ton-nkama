import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  recordListingModerationDecision,
  updateListingStatus,
} from "@/modules/listing-management/application/listing-management.service";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

const bodySchema = z
  .object({
    status: z.enum(["FOR_RENT", "FOR_SALE"]),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

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

  try {
    const mutation = await updateListingStatus({
      propertyId,
      actorUid: auth.admin.uid,
      reason: parsed.data.reason,
      status: parsed.data.status,
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

    await Promise.all([
      logAudit({
        actorId: auth.admin.uid,
        actorRoles: auth.admin.roles,
        action: "listings.status.update",
        resource: "property",
        resourceId: propertyId,
        status: "success",
        correlationId: auth.correlationId,
        details: {
          reason: parsed.data.reason,
        },
        diff: {
          beforeStatus: mutation.before.status,
          afterStatus: mutation.after.status,
          beforeState: mutation.before.state,
          afterState: mutation.after.state,
        },
      }),
      recordListingModerationDecision({
        propertyId,
        decision: "STATUS_CHANGE",
        reason: parsed.data.reason,
        beforeState: mutation.before.state,
        afterState: mutation.after.state,
        beforeStatus: mutation.before.status,
        afterStatus: mutation.after.status,
        actorId: auth.admin.uid,
        actorRoles: auth.admin.roles,
        correlationId: auth.correlationId,
      }),
    ]);

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
