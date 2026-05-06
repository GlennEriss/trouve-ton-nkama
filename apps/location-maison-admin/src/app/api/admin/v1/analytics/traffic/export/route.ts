import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import {
  listTrafficAnalytics,
  type TrafficProviderFilter,
} from "@/modules/analytics-insights/application/traffic-analytics-read.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z
  .object({
    range: z.enum(["24h", "7d", "30d", "custom"]).optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
    provider: z.enum(["all", "firebase", "vercel"]).optional(),
    maxRows: z.coerce.number().int().min(1).max(200000).optional(),
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

const PAGE_SIZE = 200;
const DEFAULT_MAX_ROWS = 50000;

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
    message: error instanceof Error ? error.message : "Impossible d'exporter les visites.",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "analytics.traffic_read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    range: request.nextUrl.searchParams.get("range") ?? undefined,
    start: request.nextUrl.searchParams.get("start") ?? undefined,
    end: request.nextUrl.searchParams.get("end") ?? undefined,
    provider: request.nextUrl.searchParams.get("provider") ?? undefined,
    maxRows: request.nextUrl.searchParams.get("maxRows") ?? undefined,
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

  const maxRows = parsed.data.maxRows ?? DEFAULT_MAX_ROWS;
  const provider = (parsed.data.provider ?? "all") as TrafficProviderFilter;
  const encoder = new TextEncoder();
  let offset = 0;
  let exportedRows = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            toCsvLine([
              "occurred_at",
              "provider",
              "metric_name",
              "metric_value",
              "page_path",
              "country",
              "device_category",
              "correlation_id",
            ]),
          ),
        );

        while (exportedRows < maxRows) {
          const page = await listTrafficAnalytics({
            range: parsed.data.range,
            start: parsed.data.start,
            end: parsed.data.end,
            provider,
            limit: PAGE_SIZE,
            offset,
            topPagesLimit: 1,
          });

          for (let index = 0; index < page.events.length && exportedRows < maxRows; index += 1) {
            const row = page.events[index];
            controller.enqueue(
              encoder.encode(
                toCsvLine([
                  row.occurredAt,
                  row.provider,
                  row.metricName,
                  row.metricValue,
                  row.pagePath ?? "",
                  row.country ?? "",
                  row.deviceCategory ?? "",
                  row.correlationId ?? "",
                ]),
              ),
            );
            exportedRows += 1;
          }

          if (!page.page.hasMore || page.events.length === 0) {
            break;
          }

          const nextOffset = page.page.nextOffset;
          if (nextOffset === null || nextOffset <= offset) {
            break;
          }
          offset = nextOffset;
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  try {
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("export-analytics-visites")}"`,
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
