import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { listAdsPeriodComparisons } from "@/modules/analytics-insights/application/ads-analytics-read.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "ads_analytics.read");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await listAdsPeriodComparisons();
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les comparaisons monétisation.",
      },
      500,
      auth.correlationId,
    );
  }
}
