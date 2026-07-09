import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import type { AdminPermission } from "@/modules/iam/domain/types";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  recordListingModerationDecision,
  updateListingState,
} from "@/modules/listing-management/application/listing-management.service";

const bodySchema = z
  .object({
    state: z.enum(["IN_PROGRESS", "ARCHIVED"]),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function hasAnyPermission(permissions: AdminPermission[], values: AdminPermission[]) {
  return values.some((value) => hasPermission(permissions, value));
}

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

  const requiredPermissions: AdminPermission[] =
    parsed.data.state === "ARCHIVED"
      ? ["listings.state.update", "listings.archive", "listings.reject"]
      : ["listings.state.update", "listings.unarchive", "listings.approve"];

  if (!hasAnyPermission(auth.admin.permissions, requiredPermissions)) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: `Permission manquante : ${requiredPermissions.join(" ou ")}`,
      },
      403,
      auth.correlationId,
    );
  }

  const auditAction = requiredPermissions.find((permission) =>
    hasPermission(auth.admin.permissions, permission),
  );

  try {
    const mutation = await updateListingState({
      propertyId,
      actorUid: auth.admin.uid,
      reason: parsed.data.reason,
      state: parsed.data.state,
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
        action: auditAction ?? "listings.state.update",
        resource: "property",
        resourceId: propertyId,
        status: "success",
        correlationId: auth.correlationId,
        diff: {
          requestedState: parsed.data.state,
          beforeState: mutation.before.state,
          afterState: mutation.after.state,
          beforeStatus: mutation.before.status,
          afterStatus: mutation.after.status,
        },
        details: {
          reason: parsed.data.reason,
        },
      }),
      recordListingModerationDecision({
        propertyId,
        decision: parsed.data.state === "ARCHIVED" ? "ARCHIVE" : "UNARCHIVE",
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
        message: error instanceof Error ? error.message : "Impossible de mettre à jour l'état de l'annonce.",
      },
      500,
      auth.correlationId,
    );
  }
}
