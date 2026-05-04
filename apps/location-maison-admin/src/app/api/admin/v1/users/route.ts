import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { listPlatformUsers } from "@/modules/user-management/application/user-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().trim().min(1).optional(),
  query: z.string().trim().optional(),
  role: z.enum(["all", "user", "announcer", "admin"]).optional(),
  status: z.enum(["all", "active", "suspended", "archived"]).optional(),
  presence: z.enum(["all", "online", "offline"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "users.read");

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit"),
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    role: request.nextUrl.searchParams.get("role") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    presence: request.nextUrl.searchParams.get("presence") ?? undefined,
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

  const result = await listPlatformUsers({
    limit: parsed.data.limit ?? 100,
    cursor: parsed.data.cursor,
    query: parsed.data.query,
    role: parsed.data.role,
    status: parsed.data.status,
    presence: parsed.data.presence,
  });

  return jsonSuccess(result, auth.correlationId);
}
