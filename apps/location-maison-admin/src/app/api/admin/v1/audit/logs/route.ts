import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { listFinanceAuditLogs } from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
  actionPrefix: z.string().trim().optional(),
  status: z.enum(["all", "success", "failed", "denied"]).optional(),
  actorId: z.string().trim().min(1).optional(),
  query: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "audit_logs.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    actionPrefix: request.nextUrl.searchParams.get("actionPrefix") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    actorId: request.nextUrl.searchParams.get("actorId") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
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
    const result = await listFinanceAuditLogs({
      limit: parsed.data.limit ?? 50,
      cursor: parsed.data.cursor,
      actionPrefix: parsed.data.actionPrefix,
      status: parsed.data.status,
      actorId: parsed.data.actorId,
      query: parsed.data.query,
    });
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les logs d'audit.",
      },
      500,
      auth.correlationId,
    );
  }
}
