import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getSearchResultRate } from "@/modules/analytics-insights/application/search-analytics-read.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z
  .object({
    range: z.enum(["24h", "7d", "30d", "custom"]).optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
    source: z
      .enum(["all", "catalog_search_page", "location_maison_search_bar", "search_with_ia_page"])
      .optional(),
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
    const result = await getSearchResultRate({
      range: parsed.data.range,
      start: parsed.data.start,
      end: parsed.data.end,
      source: parsed.data.source,
    });

    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const isCustomRangeError =
      error instanceof Error &&
      (error.message === "RANGE_CUSTOM_REQUIRES_VALID_START_END" ||
        error.message === "RANGE_CUSTOM_START_AFTER_END");

    return jsonError(
      {
        code: isCustomRangeError ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message:
          isCustomRangeError
            ? "Les paramètres start/end sont invalides pour range=custom."
            : error instanceof Error
              ? error.message
              : "Impossible de charger le taux de résultats.",
      },
      isCustomRangeError ? 400 : 500,
      auth.correlationId,
    );
  }
}
