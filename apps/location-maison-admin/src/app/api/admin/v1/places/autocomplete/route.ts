import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  fetchPlaceSuggestions,
  getMapsApiKey,
  PlacesConfigError,
  PlacesUpstreamError,
  type PlaceKind,
} from "@/lib/google/places";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

/**
 * Google Places autocomplete suggestions for a locality query, biased to Gabon.
 * Feeds the geolocation dashboard so admins select an official city/quarter name
 * instead of free-typing. The Maps key stays server-side.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return jsonSuccess({ suggestions: [] }, auth.correlationId);
  }

  const kindParam = request.nextUrl.searchParams.get("kind");
  const kind: PlaceKind = kindParam === "city" ? "city" : "quarter";
  const sessionToken = request.nextUrl.searchParams.get("sessionToken") ?? undefined;

  try {
    const apiKey = getMapsApiKey();
    const suggestions = await fetchPlaceSuggestions(query, kind, apiKey, sessionToken);
    return jsonSuccess({ suggestions }, auth.correlationId);
  } catch (error) {
    if (error instanceof PlacesConfigError) {
      return jsonError({ code: "INTERNAL_ERROR", message: error.message }, 500, auth.correlationId);
    }
    if (error instanceof PlacesUpstreamError) {
      return jsonError({ code: "INTERNAL_ERROR", message: error.message }, 502, auth.correlationId);
    }
    return jsonError(
      { code: "INTERNAL_ERROR", message: "Échec de l'autocomplétion Google Places." },
      502,
      auth.correlationId,
    );
  }
}
