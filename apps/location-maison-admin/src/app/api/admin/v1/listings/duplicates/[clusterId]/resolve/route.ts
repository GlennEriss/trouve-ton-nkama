import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { resolveListingDuplicateCluster } from "@/modules/listing-management/application/listing-management.service";

type RouteContext = {
  params: Promise<{ clusterId: string }>;
};

const bodySchema = z
  .object({
    action: z.enum([
      "not_duplicate",
      "confirm_duplicate",
      "archive_target",
      "needs_review",
    ]),
    targetListingId: z.string().trim().min(1).optional(),
    note: z.string().trim().max(600).optional(),
    limit: z.coerce.number().int().min(50).max(4000).optional(),
    minGroupSize: z.coerce.number().int().min(2).max(10).optional(),
    includeSemantic: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === "archive_target" && !value.targetListingId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetListingId est requis pour archiver une annonce du cluster.",
        path: ["targetListingId"],
      });
    }
  });

function canFinalizeDuplicateDecisions(roles: string[]) {
  return roles.some((role) =>
    role === "super_admin" ||
    role === "operations_admin" ||
    role === "moderation_admin",
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.duplicates.resolve");
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const clusterId = params.clusterId?.trim();
  if (!clusterId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant de cluster invalide.",
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

  const hasFinalizeCapability = canFinalizeDuplicateDecisions(auth.admin.roles);
  if (!hasFinalizeCapability && parsed.data.action !== "needs_review") {
    return jsonError(
      {
        code: "FORBIDDEN",
        message:
          "Seuls super_admin, operations_admin et moderation_admin peuvent finaliser ce cluster.",
      },
      403,
      auth.correlationId,
    );
  }

  try {
    const result = await resolveListingDuplicateCluster({
      clusterId,
      action: parsed.data.action,
      actorUid: auth.admin.uid,
      actorRoles: auth.admin.roles,
      note: parsed.data.note?.trim() || null,
      targetListingId: parsed.data.targetListingId?.trim() || null,
      limit: parsed.data.limit ?? 1200,
      minGroupSize: parsed.data.minGroupSize ?? 2,
      includeSemantic: parsed.data.includeSemantic,
    });

    if (!result) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Cluster de doublons introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.duplicates.resolve",
      resource: "listing_duplicate_cluster",
      resourceId: clusterId,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        decision: result.action,
        confidence: result.cluster.confidence,
        reason: result.cluster.reason,
      },
      diff: {
        targetListingId: result.archivedListingId,
        previousTargetState: result.previousTargetState,
        nextTargetState: result.nextTargetState,
        reviewedBy: auth.admin.uid,
        reviewedAt: result.cluster.resolution?.reviewedAt ?? null,
      },
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "LISTING_DUPLICATE_RESOLUTION_FAILED";
    const status =
      code === "LISTING_DUPLICATE_TARGET_REQUIRED" ||
      code === "LISTING_DUPLICATE_TARGET_NOT_IN_CLUSTER"
        ? 400
        : code === "LISTING_DUPLICATE_TARGET_NOT_FOUND"
          ? 404
          : 500;

    return jsonError(
      {
        code:
          status === 400
            ? "VALIDATION_ERROR"
            : status === 404
              ? "NOT_FOUND"
              : "INTERNAL_ERROR",
        message:
          code === "LISTING_DUPLICATE_TARGET_REQUIRED"
            ? "Sélectionne l'annonce à archiver dans ce cluster."
            : code === "LISTING_DUPLICATE_TARGET_NOT_IN_CLUSTER"
              ? "L'annonce ciblée ne fait pas partie du cluster."
              : code === "LISTING_DUPLICATE_TARGET_NOT_FOUND"
                ? "L'annonce à archiver est introuvable."
                : error instanceof Error
                  ? error.message
                  : "Impossible de résoudre ce cluster de doublons.",
        details: {
          listingErrorCode: code,
        },
      },
      status,
      auth.correlationId,
    );
  }
}
