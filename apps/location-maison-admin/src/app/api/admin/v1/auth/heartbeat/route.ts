import { NextRequest } from "next/server";

import { jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return auth.response;
  }

  return jsonSuccess(
    {
      heartbeatAt: new Date().toISOString(),
    },
    auth.correlationId,
  );
}
