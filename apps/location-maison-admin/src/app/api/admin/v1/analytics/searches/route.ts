import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/api/types";
import { listSearchAnalytics } from "@/modules/analytics-insights/application/search-analytics-read.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z
  .object({
    range: z.enum(["24h", "7d", "30d", "custom"]).optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
    source: z
      .enum(["all", "catalog_search_page", "location_maison_search_bar", "search_with_ia_page"])
      .optional(),
    resultFilter: z.enum(["all", "with_results", "without_results", "pending"]).optional(),
    query: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).max(5000).optional(),
    topLimit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.range === "custom") {
      if (!value.start || !value.end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Les paramètres start et end sont requis si range=custom.",
          path: ["range"],
        });
      }
    }
  });

function toServiceError(error: unknown) {
  type MappedServiceError = {
    status: number;
    code: ApiErrorCode;
    message: string;
  };

  if (!(error instanceof Error)) {
    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Impossible de charger les analytics de recherches.",
    } satisfies MappedServiceError;
  }

  if (
    error.message === "RANGE_CUSTOM_REQUIRES_VALID_START_END" ||
    error.message === "RANGE_CUSTOM_START_AFTER_END"
  ) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message:
        error.message === "RANGE_CUSTOM_START_AFTER_END"
          ? "La date start doit être strictement inférieure à end."
          : "Les paramètres start/end sont invalides pour range=custom.",
    } satisfies MappedServiceError;
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: error.message,
  } satisfies MappedServiceError;
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
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    offset: request.nextUrl.searchParams.get("offset") ?? undefined,
    topLimit: request.nextUrl.searchParams.get("topLimit") ?? undefined,
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
    const result = await listSearchAnalytics({
      range: parsed.data.range,
      start: parsed.data.start,
      end: parsed.data.end,
      source: parsed.data.source,
      resultFilter: parsed.data.resultFilter,
      query: parsed.data.query,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      topQueriesLimit: parsed.data.topLimit,
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const mapped = toServiceError(error);
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
