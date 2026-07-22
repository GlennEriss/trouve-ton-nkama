/**
 * Thin server-side wrappers around the Google Places web service (Autocomplete
 * + Details), biased to Gabon and in French. The Maps key is read here so it
 * never has to be exposed to the browser for these calls. Used by the
 * geolocation dashboard so admins pick an official locality name (and its
 * coordinates) instead of free-typing misspelled quarters/cities.
 */

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type AutocompletePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type AutocompleteResponse = {
  status: string;
  error_message?: string;
  predictions: AutocompletePrediction[];
};

type PlaceDetailsResponse = {
  status: string;
  error_message?: string;
  result?: {
    name?: string;
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
    address_components?: GoogleAddressComponent[];
  };
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

function pickComponent(components: GoogleAddressComponent[], types: string[]): string | null {
  for (const type of types) {
    const match = components.find((component) => component.types.includes(type));
    if (match) return match.long_name;
  }
  return null;
}

/**
 * Fetch autocomplete predictions for a locality query. Cities are restricted to
 * `(cities)`; quarters stay unrestricted so neighborhoods/sublocalities surface.
 */
export async function fetchPlaceSuggestions(
  input: string,
  kind: PlaceKind,
  apiKey: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("components", "country:ga");
  url.searchParams.set("language", "fr");
  if (kind === "city") {
    url.searchParams.set("types", "(cities)");
  }
  if (sessionToken) {
    url.searchParams.set("sessiontoken", sessionToken);
  }
  url.searchParams.set("key", apiKey);

  let payload: AutocompleteResponse;
  try {
    const response = await fetch(url, { cache: "no-store" });
    payload = (await response.json()) as AutocompleteResponse;
  } catch {
    throw new PlacesUpstreamError("Échec de l'appel à Google Places Autocomplete.");
  }

  if (payload.status === "ZERO_RESULTS") {
    return [];
  }
  if (payload.status !== "OK") {
    throw new PlacesUpstreamError(payload.error_message || `Google Places: ${payload.status}`);
  }

  return payload.predictions.map((prediction) => ({
    placeId: prediction.place_id,
    description: prediction.description,
    mainText: prediction.structured_formatting?.main_text ?? prediction.description,
    secondaryText: prediction.structured_formatting?.secondary_text ?? "",
  }));
}

/** Resolve a selected prediction to its official name + coordinates + admin area. */
export async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
  sessionToken?: string,
): Promise<PlaceDetails | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("language", "fr");
  url.searchParams.set("fields", "name,formatted_address,geometry,address_component");
  if (sessionToken) {
    url.searchParams.set("sessiontoken", sessionToken);
  }
  url.searchParams.set("key", apiKey);

  let payload: PlaceDetailsResponse;
  try {
    const response = await fetch(url, { cache: "no-store" });
    payload = (await response.json()) as PlaceDetailsResponse;
  } catch {
    throw new PlacesUpstreamError("Échec de l'appel à Google Places Details.");
  }

  if (payload.status === "ZERO_RESULTS" || !payload.result) {
    return null;
  }
  if (payload.status !== "OK") {
    throw new PlacesUpstreamError(payload.error_message || `Google Places: ${payload.status}`);
  }

  const result = payload.result;
  const location = result.geometry?.location;
  if (!location) {
    return null;
  }
  const components = result.address_components ?? [];

  return {
    name: result.name ?? "",
    formattedAddress: result.formatted_address ?? "",
    latitude: location.lat,
    longitude: location.lng,
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
