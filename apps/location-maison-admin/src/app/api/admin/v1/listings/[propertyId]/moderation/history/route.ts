import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { listListingModerationHistory } from "@/modules/listing-management/application/listing-management.service";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.read");
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

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Paramètres invalides.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await listListingModerationHistory({
      propertyId,
      limit: parsed.data.limit ?? 80,
    });

    const canReadAuditLogs = hasPermission(auth.admin.permissions, "audit_logs.read");

    return jsonSuccess(
      {
        propertyId: result.propertyId,
        decisions: result.decisions,
        auditLogs: canReadAuditLogs ? result.auditLogs : [],
      },
      auth.correlationId,
    );
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger l'historique de modération.",
      },
      500,
      auth.correlationId,
    );
  }
}
