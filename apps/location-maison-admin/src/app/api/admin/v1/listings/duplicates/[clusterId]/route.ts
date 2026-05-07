import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { getListingDuplicateCluster } from "@/modules/listing-management/application/listing-management.service";

type RouteContext = {
  params: Promise<{ clusterId: string }>;
};

const querySchema = z.object({
  limit: z.coerce.number().int().min(50).max(4000).optional(),
  minGroupSize: z.coerce.number().int().min(2).max(10).optional(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.duplicates.read");
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

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    minGroupSize: request.nextUrl.searchParams.get("minGroupSize") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Paramètres de requête invalides.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await getListingDuplicateCluster({
      clusterId,
      limit: parsed.data.limit ?? 1200,
      minGroupSize: parsed.data.minGroupSize ?? 2,
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

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger le cluster de doublons.",
      },
      500,
      auth.correlationId,
    );
  }
}
