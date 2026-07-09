import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import { listAdsExportRows } from "@/modules/analytics-insights/application/ads-analytics-read.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z
  .object({
    range: z.enum(["24h", "7d", "30d", "custom"]).optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.range === "custom" && (!value.start || !value.end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les paramètres start et end sont requis si range=custom.",
        path: ["range"],
      });
    }
  });

function mapServiceError(error: unknown) {
  if (error instanceof Error && error.message === "RANGE_CUSTOM_START_AFTER_END") {
    return {
      status: 400,
      code: "VALIDATION_ERROR" as const,
      message: "La date start doit être strictement inférieure à end.",
    };
  }

  if (error instanceof Error && error.message === "RANGE_CUSTOM_REQUIRES_VALID_START_END") {
    return {
      status: 400,
      code: "VALIDATION_ERROR" as const,
      message: "Les paramètres start/end sont invalides pour range=custom.",
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR" as const,
    message:
      error instanceof Error ? error.message : "Impossible d'exporter les analytics monétisation.",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "ads_analytics.export");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    range: request.nextUrl.searchParams.get("range") ?? undefined,
    start: request.nextUrl.searchParams.get("start") ?? undefined,
    end: request.nextUrl.searchParams.get("end") ?? undefined,
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
    const rows = await listAdsExportRows({
      range: parsed.data.range,
      start: parsed.data.start,
      end: parsed.data.end,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            toCsvLine([
              "date_key",
              "estimated_earnings",
              "page_views",
              "sessions",
              "revenue_per_1k_sessions",
              "page_views_rpm",
              "fill_rate",
              "ctr",
              "viewability",
            ]),
          ),
        );

        for (const row of rows) {
          controller.enqueue(
            encoder.encode(
              toCsvLine([
                row.dateKey,
                row.estimatedEarnings,
                row.pageViews,
                row.sessions,
                row.revenuePer1kSessions ?? "",
                row.pageViewsRpm ?? "",
                row.fillRate ?? "",
                row.ctr ?? "",
                row.viewability ?? "",
              ]),
            ),
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("export-analytics-ads")}"`,
        "Cache-Control": "no-store",
        "x-correlation-id": auth.correlationId,
      },
    });
  } catch (error) {
    const mapped = mapServiceError(error);
    return jsonError(
      {
        code: mapped.code,
        message: mapped.message,
      },
      mapped.status,
      auth.correlationId,
    );
  }
}
