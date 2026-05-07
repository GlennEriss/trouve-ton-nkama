import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import type { AdminPermission } from "@/modules/iam/domain/types";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { bulkUpdateListingState } from "@/modules/listing-management/application/listing-management.service";

const bodySchema = z
  .object({
    propertyIds: z.array(z.string().trim().min(1)).min(1).max(300),
    state: z.enum(["IN_PROGRESS", "ARCHIVED"]),
  })
  .strict();

function hasAnyPermission(
  permissions: AdminPermission[],
  values: AdminPermission[],
) {
  return values.some((value) => hasPermission(permissions, value));
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
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

  const requiredPermissions: AdminPermission[] =
    parsed.data.state === "ARCHIVED"
      ? ["listings.bulk.archive", "listings.reject"]
      : ["listings.bulk.unarchive", "listings.approve"];

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

  const auditAction = hasPermission(auth.admin.permissions, requiredPermissions[0])
    ? requiredPermissions[0]
    : requiredPermissions[1];

  try {
    const result = await bulkUpdateListingState({
      propertyIds: parsed.data.propertyIds,
      actorUid: auth.admin.uid,
      state: parsed.data.state,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: auditAction,
      resource: "property_bulk",
      status: "success",
      correlationId: auth.correlationId,
      details: {
        requestedCount: result.requestedCount,
        updatedCount: result.updatedCount,
        notFoundCount: result.notFoundCount,
        failedCount: result.failedCount,
      },
      diff: {
        state: result.state,
        updatedIds: result.updated.slice(0, 100).map((entry) => entry.id),
        notFoundIds: result.notFoundIds.slice(0, 100),
        failed: result.failed.slice(0, 30),
      },
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'appliquer l'action en masse sur les annonces.",
      },
      500,
      auth.correlationId,
    );
  }
}
