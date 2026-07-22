import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  fetchPlaceDetails,
  getMapsApiKey,
  PlacesConfigError,
  PlacesUpstreamError,
} from "@/lib/google/places";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

/**
 * Resolve a selected Google Places prediction (place_id) to its official name,
 * coordinates and administrative area. Called after the admin clicks a
 * suggestion in the geolocation dashboard.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Paramètre 'placeId' requis." },
      400,
      auth.correlationId,
    );
  }

  const sessionToken = request.nextUrl.searchParams.get("sessionToken") ?? undefined;

  try {
    const apiKey = getMapsApiKey();
    const details = await fetchPlaceDetails(placeId, apiKey, sessionToken);
    if (!details) {
      return jsonSuccess({ found: false as const }, auth.correlationId);
    }
    return jsonSuccess({ found: true as const, ...details }, auth.correlationId);
  } catch (error) {
    if (error instanceof PlacesConfigError) {
      return jsonError({ code: "INTERNAL_ERROR", message: error.message }, 500, auth.correlationId);
    }
    if (error instanceof PlacesUpstreamError) {
      return jsonError({ code: "INTERNAL_ERROR", message: error.message }, 502, auth.correlationId);
    }
    return jsonError(
      { code: "INTERNAL_ERROR", message: "Échec de la récupération du lieu Google Places." },
      502,
      auth.correlationId,
    );
  }
}
