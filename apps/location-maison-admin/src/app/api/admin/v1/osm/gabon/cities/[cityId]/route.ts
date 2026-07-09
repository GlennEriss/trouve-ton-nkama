import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  removeGeoCity,
  updateGeoCity,
} from "@/modules/location-osm/application/gabon-osm-location-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    province: z.string().trim().min(2).max(120).optional(),
    lat: z.coerce.number().finite().optional(),
    lon: z.coerce.number().finite().optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ cityId: string }>;
};

function resolveUpdateError(code: string) {
  if (code === "CITY_ALREADY_EXISTS") {
    return { status: 409, apiCode: "CONFLICT" as const, message: "Cette ville existe déjà dans cette province." };
  }
  if (code === "CITY_EMPTY_PATCH" || code.includes("_INVALID") || code.includes("_REQUIRED")) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Mise à jour de ville invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de mettre à jour cette ville." };
}

function resolveDeleteError(code: string) {
  if (code.includes("_INVALID")) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Identifiant de ville invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de supprimer cette ville." };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  const { cityId } = await context.params;
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
    const city = await updateGeoCity({
      cityId,
      patch: parsed.data,
    });
    if (!city) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Ville introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "geo_city",
      resourceId: city.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "update", patch: parsed.data },
    });

    return jsonSuccess({ city }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveUpdateError(code);
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  const { cityId } = await context.params;

  try {
    const removed = await removeGeoCity(cityId);
    if (!removed) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Ville introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "geo_city",
      resourceId: removed.city.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "delete",
        city: removed.city,
        deletedQuarters: removed.deletedQuarters,
      },
    });

    return jsonSuccess(
      {
        city: removed.city,
        deletedQuarters: removed.deletedQuarters,
      },
      auth.correlationId,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveDeleteError(code);
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
