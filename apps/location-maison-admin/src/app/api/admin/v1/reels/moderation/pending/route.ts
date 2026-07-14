import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { listPendingReels } from "@/modules/reels-moderation/application/reels-moderation.service";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().trim().min(1).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (
    !hasPermission(auth.admin.permissions, "listings.approve") &&
    !hasPermission(auth.admin.permissions, "listings.reject")
  ) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Permission manquante : listings.approve ou listings.reject",
      },
      403,
      auth.correlationId,
    );
  }

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Paramètres de requête invalides.",
        details: { issues: parsed.error.issues },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await listPendingReels({
      limit: parsed.data.limit ?? 20,
      cursor: parsed.data.cursor,
    });
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger la file de modération.",
      },
      500,
      auth.correlationId,
    );
  }
}
