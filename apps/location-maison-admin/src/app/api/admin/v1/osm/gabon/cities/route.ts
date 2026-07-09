import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { createGeoCity } from "@/modules/location-osm/application/gabon-osm-location-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    province: z.string().trim().min(2).max(120),
    lat: z.coerce.number().finite(),
    lon: z.coerce.number().finite(),
  })
  .strict();

function resolveCreateError(code: string) {
  if (code === "CITY_ALREADY_EXISTS") {
    return { status: 409, apiCode: "CONFLICT" as const, message: "Cette ville existe déjà dans cette province." };
  }
  if (code.includes("_INVALID") || code.includes("_REQUIRED")) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Données de ville invalides." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de créer cette ville." };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
        details: { issues: parsed.error.issues },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const city = await createGeoCity(parsed.data);

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "geo_city",
      resourceId: city.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "create", city },
    });

    return jsonSuccess({ city }, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveCreateError(code);
    return jsonError(
      {
        code: mapped.apiCode,
        message: mapped.message,
        details: { geoErrorCode: code },
      },
      mapped.status,
      auth.correlationId,
    );
  }
}
