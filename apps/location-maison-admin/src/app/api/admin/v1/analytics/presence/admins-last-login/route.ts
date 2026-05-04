import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { listAdminsLastLogin } from "@/modules/analytics-insights/application/presence-analytics-read.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().trim().optional(),
});

function mapServiceError(error: unknown) {
  if (error instanceof Error && error.message === "INVALID_CURSOR") {
    return {
      status: 400,
      code: "VALIDATION_ERROR" as const,
      message: "Cursor invalide.",
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR" as const,
    message: error instanceof Error ? error.message : "Impossible de charger admins-last-login.",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "admins.view_last_login");
  if (!auth.ok) {
    return auth.response;
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
    const result = await listAdminsLastLogin({
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
    });
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const mapped = mapServiceError(error);
    return jsonError(
      { code: mapped.code, message: mapped.message },
      mapped.status,
      auth.correlationId,
    );
  }
}
