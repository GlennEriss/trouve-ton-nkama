import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  getGabonOsmSelectorDataFromProjection,
  shouldPreferGabonOsmProjection,
} from "@/modules/location-osm/application/gabon-osm-projection.service";
import { getGabonOsmSelectorDataFromRoot } from "@/modules/location-osm/application/gabon-osm.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  const preferProjection = shouldPreferGabonOsmProjection();
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";

  let data = null;
  if (preferProjection && !forceRefresh) {
    data = await getGabonOsmSelectorDataFromProjection();
  }
  if (!data) {
    data = await getGabonOsmSelectorDataFromRoot(forceRefresh);
  }

  if (!data) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          "Impossible de charger la source OSM Gabon (projection Firestore + source cloud/local). Vérifie la sync projection et la configuration OSM_STORAGE_*.",
        details: {
          osmErrorCode: "OSM_UNAVAILABLE",
        },
      },
      500,
      auth.correlationId,
    );
  }

  return jsonSuccess(data, auth.correlationId);
}
