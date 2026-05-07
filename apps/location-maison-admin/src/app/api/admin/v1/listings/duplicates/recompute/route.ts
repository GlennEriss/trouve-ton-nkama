import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { recomputeListingDuplicateGroups } from "@/modules/listing-management/application/listing-management.service";

const bodySchema = z
  .object({
    limit: z.coerce.number().int().min(50).max(4000).optional(),
    minGroupSize: z.coerce.number().int().min(2).max(10).optional(),
    includeResolved: z.boolean().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.duplicates.recompute");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({}));
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
    const result = await recomputeListingDuplicateGroups({
      limit: parsed.data.limit ?? 1200,
      minGroupSize: parsed.data.minGroupSize ?? 2,
      includeResolved: parsed.data.includeResolved,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.duplicates.recompute",
      resource: "listing_duplicate_cluster",
      status: "success",
      correlationId: auth.correlationId,
      details: {
        scanned: result.scanned,
        returned: result.returned,
        resolvedCount: result.resolvedCount,
        unresolvedCount: result.unresolvedCount,
      },
      diff: {
        requestedLimit: parsed.data.limit ?? 1200,
        requestedMinGroupSize: parsed.data.minGroupSize ?? 2,
        includeResolved: parsed.data.includeResolved ?? true,
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
            : "Impossible de recalculer les doublons.",
      },
      500,
      auth.correlationId,
    );
  }
}
