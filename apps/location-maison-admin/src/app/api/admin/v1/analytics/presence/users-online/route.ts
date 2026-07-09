import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { listPresenceOnline } from "@/modules/analytics-insights/application/presence-analytics-read.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z
  .object({
    range: z.enum(["24h", "7d", "30d", "custom"]).optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
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
    message: error instanceof Error ? error.message : "Impossible de charger users-online.",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "users.view_presence");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    range: request.nextUrl.searchParams.get("range") ?? undefined,
    start: request.nextUrl.searchParams.get("start") ?? undefined,
    end: request.nextUrl.searchParams.get("end") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
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
    const result = await listPresenceOnline({
      subject: "user",
      range: parsed.data.range,
      start: parsed.data.start,
      end: parsed.data.end,
      limit: parsed.data.limit,
    });
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    const mapped = mapServiceError(error);
    return jsonError(
      { code: mapped.code, message: mapped.message },
      mapped.status,
      auth.correlationId,
    );
  }
}
