import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { syncGabonOsmProjectionFromRoot } from "@/modules/location-osm/application/gabon-osm-projection.service";

function mapSyncError(code: string) {
  if (code === "OSM_SOURCE_UNAVAILABLE") {
    return {
      status: 503,
      apiCode: "INTERNAL_ERROR" as const,
      message: "La source OSM Gabon est indisponible.",
    };
  }
  return {
    status: 500,
    apiCode: "INTERNAL_ERROR" as const,
    message: "Impossible de synchroniser la projection OSM.",
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.update");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await syncGabonOsmProjectionFromRoot();

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "geo_osm_projection",
      resourceId: "gabon",
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "sync",
        counts: result.counts,
        source: {
          mode: result.sourceMode,
          path: result.sourcePath,
          bucket: result.sourceBucket,
          objectPath: result.sourceObjectPath,
          sourceUpdatedAt: result.sourceUpdatedAt,
        },
      },
    });

    return jsonSuccess({ projection: result }, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = mapSyncError(code);

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.update",
      resource: "geo_osm_projection",
      resourceId: "gabon",
      status: "failed",
      correlationId: auth.correlationId,
      details: {
        projectionSyncErrorCode: code,
      },
    });

    return jsonError(
      {
        code: mapped.apiCode,
        message: mapped.message,
        details: {
          projectionSyncErrorCode: code,
        },
      },
      mapped.status,
      auth.correlationId,
    );
  }
}
