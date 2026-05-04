import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  listTrafficAnalytics,
} from "@/modules/analytics-insights/application/traffic-analytics-read.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z
  .object({
    range: z.enum(["24h", "7d", "30d", "custom"]).optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
    provider: z.enum(["all", "firebase", "vercel"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).max(5000).optional(),
    topPagesLimit: z.coerce.number().int().min(1).max(30).optional(),
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

function toServiceError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      status: 500,
      code: "INTERNAL_ERROR" as const,
      message: "Impossible de charger les analytics de visites.",
    };
  }

  if (
    error.message === "RANGE_CUSTOM_REQUIRES_VALID_START_END" ||
    error.message === "RANGE_CUSTOM_START_AFTER_END"
  ) {
    return {
      status: 400,
      code: "VALIDATION_ERROR" as const,
      message:
        error.message === "RANGE_CUSTOM_START_AFTER_END"
          ? "La date start doit être strictement inférieure à end."
          : "Les paramètres start/end sont invalides pour range=custom.",
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR" as const,
    message: error.message,
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
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    offset: request.nextUrl.searchParams.get("offset") ?? undefined,
    topPagesLimit: request.nextUrl.searchParams.get("topPagesLimit") ?? undefined,
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
    const result = await listTrafficAnalytics({
      range: parsed.data.range,
      start: parsed.data.start,
      end: parsed.data.end,
      provider: parsed.data.provider,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      topPagesLimit: parsed.data.topPagesLimit,
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
