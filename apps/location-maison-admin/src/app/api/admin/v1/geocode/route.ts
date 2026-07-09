import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
  };
  address_components: GoogleAddressComponent[];
  partial_match?: boolean;
};

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results: GoogleGeocodeResult[];
};

function pickComponent(components: GoogleAddressComponent[], types: string[]): string | null {
  for (const type of types) {
    const match = components.find((component) => component.types.includes(type));
    if (match) return match.long_name;
  }
  return null;
}

/**
 * Geocode a free-text Gabonese locality (quarter/landmark) via Google. Used as
 * the fallback when the OSM Gabon dataset has no match. Biased to Gabon and the
 * API key stays server-side.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Paramètre 'q' requis." },
      400,
      auth.correlationId,
    );
  }

  // The platform stores the Maps key under the NEXT_PUBLIC_ name (used by the
  // Google Maps JS SDK); it is also readable server-side here.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return jsonError(
      { code: "INTERNAL_ERROR", message: "Clé Google Maps non configurée (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)." },
      500,
      auth.correlationId,
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("components", "country:GA");
  url.searchParams.set("region", "ga");
  url.searchParams.set("language", "fr");
  url.searchParams.set("key", apiKey);

  let payload: GoogleGeocodeResponse;
  try {
    const response = await fetch(url, { cache: "no-store" });
    payload = (await response.json()) as GoogleGeocodeResponse;
  } catch {
    return jsonError(
      { code: "INTERNAL_ERROR", message: "Échec de l'appel à Google Geocoding." },
      502,
      auth.correlationId,
    );
  }

  if (payload.status === "ZERO_RESULTS" || payload.results.length === 0) {
    return jsonSuccess({ found: false as const }, auth.correlationId);
  }
  if (payload.status !== "OK") {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: `Google Geocoding: ${payload.status}`,
        details: { errorMessage: payload.error_message ?? null },
      },
      502,
      auth.correlationId,
    );
  }

  const result = payload.results[0];
  const components = result.address_components;

  return jsonSuccess(
    {
      found: true as const,
      formattedAddress: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      province: pickComponent(components, ["administrative_area_level_1"]),
      city: pickComponent(components, ["locality", "administrative_area_level_2", "postal_town"]),
      quarter: pickComponent(components, [
        "sublocality",
        "sublocality_level_1",
        "neighborhood",
        "administrative_area_level_3",
      ]),
      // ROOFTOP/GEOMETRIC_CENTER ⇒ precise point; APPROXIMATE ⇒ area centroid.
      isLocExact: result.geometry.location_type === "ROOFTOP",
      partialMatch: result.partial_match ?? false,
    },
    auth.correlationId,
  );
}
