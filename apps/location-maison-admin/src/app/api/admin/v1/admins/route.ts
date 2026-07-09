import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonSuccess } from "@/lib/api/response";
import { listAdminsWithPresence } from "@/modules/admin-management/application/admin-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "admins.read");

  if (!auth.ok) {
    return auth.response;
  }

  const parsedQuery = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit"),
  });
  const limit = parsedQuery.success ? parsedQuery.data.limit : undefined;
  const result = await listAdminsWithPresence(limit ?? 100);

  return jsonSuccess(
    result,
    auth.correlationId,
  );
}
