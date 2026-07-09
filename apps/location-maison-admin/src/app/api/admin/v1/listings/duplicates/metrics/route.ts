import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { getListingDuplicateMonitoringMetrics } from "@/modules/listing-management/application/listing-management.service";

const querySchema = z.object({
  limit: z.coerce.number().int().min(50).max(4000).optional(),
  minGroupSize: z.coerce.number().int().min(2).max(10).optional(),
  includeSemantic: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.duplicates.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    minGroupSize: request.nextUrl.searchParams.get("minGroupSize") ?? undefined,
    includeSemantic:
      request.nextUrl.searchParams.get("includeSemantic") ?? undefined,
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
    const metrics = await getListingDuplicateMonitoringMetrics({
      limit: parsed.data.limit ?? 1200,
      minGroupSize: parsed.data.minGroupSize ?? 2,
      includeSemantic: parsed.data.includeSemantic !== "false",
    });

    return jsonSuccess({ metrics }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les métriques de qualité dedup.",
      },
      500,
      auth.correlationId,
    );
  }
}
