import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  removeGeoQuarter,
  updateGeoQuarter,
} from "@/modules/location-osm/application/gabon-osm-location-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const bodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    aliases: z.array(z.string().trim().min(2).max(120)).max(20).optional(),
    city: z.string().trim().min(2).max(120).optional(),
    province: z.string().trim().min(2).max(120).optional(),
    lat: z.coerce.number().finite().optional(),
    lon: z.coerce.number().finite().optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ quarterId: string }>;
};

function resolveUpdateError(code: string) {
  if (code === "QUARTER_ALREADY_EXISTS") {
    return { status: 409, apiCode: "CONFLICT" as const, message: "Ce quartier existe déjà pour cette ville." };
  }
  if (code === "QUARTER_EMPTY_PATCH" || code.includes("_INVALID") || code.includes("_REQUIRED")) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Mise à jour de quartier invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de mettre à jour ce quartier." };
}

function resolveDeleteError(code: string) {
  if (code.includes("_INVALID")) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Identifiant de quartier invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de supprimer ce quartier." };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  const { quarterId } = await context.params;
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
    const quarter = await updateGeoQuarter({
      quarterId,
      patch: parsed.data,
    });
    if (!quarter) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Quartier introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "geo_quarter",
      resourceId: quarter.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "update", patch: parsed.data },
    });

    return jsonSuccess({ quarter }, auth.correlationId);
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

  const { quarterId } = await context.params;

  try {
    const removed = await removeGeoQuarter(quarterId);
    if (!removed) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Quartier introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "geo_quarter",
      resourceId: removed.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "delete",
        quarter: removed,
      },
    });

    return jsonSuccess({ quarter: removed }, auth.correlationId);
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
