import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { getGabonOsmSelectorData } from "@/modules/location-osm/application/gabon-osm.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.create");
  if (!auth.ok) {
    return auth.response;
  }

  const data = await getGabonOsmSelectorData();
  if (!data) {
    return jsonError(
      {
        code: "OSM_UNAVAILABLE",
        message:
          "Impossible de charger la source OSM Gabon (Cloud Storage + fallback local). Vérifie OSM_STORAGE_BUCKET / OSM_STORAGE_OBJECT_PATH ou le fichier local.",
      },
      500,
      auth.correlationId,
    );
  }

  return jsonSuccess(data, auth.correlationId);
}
