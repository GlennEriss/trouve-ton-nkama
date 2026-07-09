import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  recordListingModerationDecision,
  updateListingState,
} from "@/modules/listing-management/application/listing-management.service";

const bodySchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (
    !hasPermission(auth.admin.permissions, "listings.approve") &&
    !hasPermission(auth.admin.permissions, "listings.state.update")
  ) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Permission manquante : listings.approve ou listings.state.update",
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
    const mutation = await updateListingState({
      propertyId,
      actorUid: auth.admin.uid,
      reason: parsed.data.reason,
      state: "IN_PROGRESS",
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
        action: "listings.approve",
        resource: "property",
        resourceId: propertyId,
        status: "success",
        correlationId: auth.correlationId,
        details: {
          reason: parsed.data.reason,
        },
        diff: {
          beforeState: mutation.before.state,
          afterState: mutation.after.state,
          beforeStatus: mutation.before.status,
          afterStatus: mutation.after.status,
        },
      }),
      recordListingModerationDecision({
        propertyId,
        decision: "APPROVE",
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
        message: error instanceof Error ? error.message : "Impossible d'approuver l'annonce.",
      },
      500,
      auth.correlationId,
    );
  }
}
