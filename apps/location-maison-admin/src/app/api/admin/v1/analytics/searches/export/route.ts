import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import {
  listSearchAnalytics,
  type SearchAnalyticsResultFilter,
  type SearchAnalyticsSourceFilter,
} from "@/modules/analytics-insights/application/search-analytics-read.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z
  .object({
    range: z.enum(["24h", "7d", "30d", "custom"]).optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
    source: z
      .enum(["all", "catalog_search_page", "location_maison_search_bar", "search_with_ia_page", "property_location_form"])
      .optional(),
    resultFilter: z.enum(["all", "with_results", "without_results", "pending"]).optional(),
    query: z.string().trim().optional(),
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
    message: error instanceof Error ? error.message : "Impossible d'exporter les recherches.",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "analytics.search_read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    range: request.nextUrl.searchParams.get("range") ?? undefined,
    start: request.nextUrl.searchParams.get("start") ?? undefined,
    end: request.nextUrl.searchParams.get("end") ?? undefined,
    source: request.nextUrl.searchParams.get("source") ?? undefined,
    resultFilter: request.nextUrl.searchParams.get("resultFilter") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
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
  const source = (parsed.data.source ?? "all") as SearchAnalyticsSourceFilter;
  const resultFilter = (parsed.data.resultFilter ?? "all") as SearchAnalyticsResultFilter;
  const encoder = new TextEncoder();
  let offset = 0;
  let exportedRows = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            toCsvLine([
              "search_id",
              "occurred_at",
              "source",
              "query_text_raw",
              "query_text_normalized",
              "results_count",
              "has_results",
              "result_status",
              "execution_ms",
              "actor_id",
              "is_authenticated",
              "session_id",
              "correlation_id",
              "filters_json",
            ]),
          ),
        );

        while (exportedRows < maxRows) {
          const page = await listSearchAnalytics({
            range: parsed.data.range,
            start: parsed.data.start,
            end: parsed.data.end,
            source,
            resultFilter,
            query: parsed.data.query,
            limit: PAGE_SIZE,
            offset,
            topQueriesLimit: 1,
          });

          for (let index = 0; index < page.searches.length && exportedRows < maxRows; index += 1) {
            const row = page.searches[index];
            controller.enqueue(
              encoder.encode(
                toCsvLine([
                  row.searchId,
                  row.occurredAt,
                  row.source,
                  row.queryTextRaw ?? "",
                  row.queryTextNormalized ?? "",
                  row.resultsCount ?? "",
                  row.hasResults ?? "",
                  row.resultStatus,
                  row.executionMs ?? "",
                  row.actorId ?? "",
                  row.isAuthenticated ?? "",
                  row.sessionId ?? "",
                  row.correlationId ?? "",
                  row.filters ? JSON.stringify(row.filters) : "",
                ]),
              ),
            );
            exportedRows += 1;
          }

          if (!page.page.hasMore || page.searches.length === 0) {
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
        "Content-Disposition": `attachment; filename="${csvFilename("export-analytics-recherches")}"`,
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
