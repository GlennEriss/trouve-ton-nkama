import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { listFinanceTransactions } from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
  query: z.string().trim().optional(),
  uid: z.string().trim().min(1).optional(),
  type: z.enum(["all", "purchase", "spend", "grant"]).optional(),
  status: z.enum(["all", "pending", "success", "failed", "cancelled"]).optional(),
  createdAfter: z.string().trim().optional(),
  createdBefore: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "transactions.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    uid: request.nextUrl.searchParams.get("uid") ?? undefined,
    type: request.nextUrl.searchParams.get("type") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    createdAfter: request.nextUrl.searchParams.get("createdAfter") ?? undefined,
    createdBefore: request.nextUrl.searchParams.get("createdBefore") ?? undefined,
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
    const result = await listFinanceTransactions({
      limit: parsed.data.limit ?? 50,
      cursor: parsed.data.cursor,
      query: parsed.data.query,
      uid: parsed.data.uid,
      type: parsed.data.type,
      status: parsed.data.status,
      createdAfter: parsed.data.createdAfter,
      createdBefore: parsed.data.createdBefore,
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "Impossible de charger les transactions.",
      },
      500,
      auth.correlationId,
    );
  }
}
