import type { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { ingestAdSenseReportRows } from "@/modules/analytics-insights/application/ads-analytics-adapter.service";
import { adsenseAnalyticsAdapterBodySchema } from "@/modules/analytics-insights/domain/ads-analytics-adapter.schema";
import { requireAnalyticsIngestionAuth } from "@/modules/analytics-insights/presentation/analytics-ingestion-guard";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAnalyticsIngestionAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  if (auth.sourceHeader !== "location-maison") {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Cet adaptateur accepte uniquement X-Analytics-Source=location-maison.",
      },
      403,
      auth.correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = adsenseAnalyticsAdapterBodySchema.safeParse(body);

  if (!parsedBody.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requete adaptateur adsense invalide.",
        details: {
          issues: parsedBody.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await ingestAdSenseReportRows(parsedBody.data);

    return jsonSuccess(
      {
        inserted: result.insertedRows,
        refreshed_range: result.refreshedRange,
      },
      auth.correlationId,
      202,
    );
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Echec interne de l'adaptateur adsense.",
      },
      500,
      auth.correlationId,
    );
  }
}

