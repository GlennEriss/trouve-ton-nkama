/**
 * Thin server-side wrappers around the Google Places API (New) — Autocomplete +
 * Place Details — biased to Gabon and in French. The Maps key is read here so it
 * never has to be exposed to the browser for these calls. Used by the
 * geolocation dashboard so admins pick an official locality name (and its
 * coordinates) instead of free-typing misspelled quarters/cities.
 *
 * Places API (New) endpoints (the legacy `maps/api/place/*` web service is a
 * separate, often-disabled product):
 *   POST https://places.googleapis.com/v1/places:autocomplete
 *   GET  https://places.googleapis.com/v1/places/{placeId}
 */

type NewAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
  error?: { message?: string; status?: string };
};

type PlaceDetailsResponse = {
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: NewAddressComponent[];
  error?: { message?: string; status?: string };
};

export type PlaceKind = "city" | "quarter";

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceDetails = {
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  province: string | null;
  city: string | null;
  quarter: string | null;
};

export class PlacesConfigError extends Error {}
export class PlacesUpstreamError extends Error {}

/** The Maps key is stored under the NEXT_PUBLIC name but is also read here. */
export function getMapsApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new PlacesConfigError("Clé Google Maps non configurée (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).");
  }
  return apiKey;
}

function pickComponent(components: NewAddressComponent[], types: string[]): string | null {
  for (const type of types) {
    const match = components.find((component) => component.types?.includes(type));
    if (match?.longText) return match.longText;
  }
  return null;
}

/**
 * Fetch autocomplete predictions for a locality query. Cities are restricted to
 * administrative locality types; quarters stay unrestricted so neighborhoods /
 * sublocalities surface. Restricted to Gabon.
 */
export async function fetchPlaceSuggestions(
  input: string,
  kind: PlaceKind,
  apiKey: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const body: Record<string, unknown> = {
    input,
    includedRegionCodes: ["ga"],
    languageCode: "fr",
  };
  if (kind === "city") {
    body.includedPrimaryTypes = ["locality", "administrative_area_level_2", "administrative_area_level_3"];
  }
  if (sessionToken) {
    body.sessionToken = sessionToken;
  }

  let response: Response;
  let payload: AutocompleteResponse;
  try {
    response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    payload = (await response.json()) as AutocompleteResponse;
  } catch {
    throw new PlacesUpstreamError("Échec de l'appel à Google Places Autocomplete.");
  }

  if (!response.ok) {
    throw new PlacesUpstreamError(payload.error?.message || `Google Places: ${response.status}`);
  }

  return (payload.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction?.placeId))
    .map((prediction) => {
      const description = prediction.text?.text ?? "";
      return {
        placeId: prediction.placeId as string,
        description,
        mainText: prediction.structuredFormat?.mainText?.text ?? description,
        secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
      };
    });
}

/** Resolve a selected prediction to its official name + coordinates + admin area. */
export async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
  sessionToken?: string,
): Promise<PlaceDetails | null> {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "fr");
  if (sessionToken) {
    url.searchParams.set("sessionToken", sessionToken);
  }

  let response: Response;
  let payload: PlaceDetailsResponse;
  try {
    response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,formattedAddress,location,addressComponents",
      },
      cache: "no-store",
    });
    payload = (await response.json()) as PlaceDetailsResponse;
  } catch {
    throw new PlacesUpstreamError("Échec de l'appel à Google Places Details.");
  }

  if (!response.ok) {
    throw new PlacesUpstreamError(payload.error?.message || `Google Places: ${response.status}`);
  }

  const location = payload.location;
  if (location?.latitude == null || location?.longitude == null) {
    return null;
  }
  const components = payload.addressComponents ?? [];

  return {
    name: payload.displayName?.text ?? "",
    formattedAddress: payload.formattedAddress ?? "",
    latitude: location.latitude,
    longitude: location.longitude,
    province: pickComponent(components, ["administrative_area_level_1"]),
    city: pickComponent(components, ["locality", "administrative_area_level_2", "postal_town"]),
    quarter: pickComponent(components, [
      "sublocality",
      "sublocality_level_1",
      "neighborhood",
      "administrative_area_level_3",
    ]),
  };
}
