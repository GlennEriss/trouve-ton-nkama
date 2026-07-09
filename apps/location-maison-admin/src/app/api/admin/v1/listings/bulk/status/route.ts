import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  bulkUpdateListingStatus,
  recordListingModerationDecision,
} from "@/modules/listing-management/application/listing-management.service";

const bodySchema = z
  .object({
    propertyIds: z.array(z.string().trim().min(1)).min(1).max(300),
    status: z.enum(["FOR_RENT", "FOR_SALE"]),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (
    !hasPermission(auth.admin.permissions, "listings.bulk.update") &&
    !hasPermission(auth.admin.permissions, "listings.status.update")
  ) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Permission manquante : listings.bulk.update ou listings.status.update",
      },
      403,
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
    const result = await bulkUpdateListingStatus({
      propertyIds: parsed.data.propertyIds,
      actorUid: auth.admin.uid,
      reason: parsed.data.reason,
      status: parsed.data.status,
    });

    await Promise.all([
      logAudit({
        actorId: auth.admin.uid,
        actorRoles: auth.admin.roles,
        action: "listings.bulk.update",
        resource: "property_bulk",
        status: "success",
        correlationId: auth.correlationId,
        details: {
          reason: parsed.data.reason,
          status: parsed.data.status,
          requestedCount: result.requestedCount,
          updatedCount: result.updatedCount,
          notFoundCount: result.notFoundCount,
          failedCount: result.failedCount,
        },
        diff: {
          status: result.status,
          updatedIds: result.updated.slice(0, 100).map((entry) => entry.id),
          notFoundIds: result.notFoundIds.slice(0, 100),
          failed: result.failed.slice(0, 30),
        },
      }),
      ...result.updated.map((entry) =>
        recordListingModerationDecision({
          propertyId: entry.id,
          decision: "BULK_STATUS_CHANGE",
          reason: parsed.data.reason,
          beforeState: null,
          afterState: null,
          beforeStatus: entry.beforeStatus,
          afterStatus: entry.afterStatus,
          actorId: auth.admin.uid,
          actorRoles: auth.admin.roles,
          correlationId: auth.correlationId,
        }),
      ),
    ]);

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour le statut des annonces en masse.",
      },
      500,
      auth.correlationId,
    );
  }
}
