import type {
  GabonOsmCityOption,
  GabonOsmProvinceOption,
  GabonOsmQuarterOption,
  GabonOsmSelectorData,
} from "@/modules/location-osm/domain/types";
import type { ApifyListingDraft } from "../domain/types";
import { buildListingContent, deLeet } from "./apify-transform.service";

export type GeoSource = "known" | "osm-quarter" | "osm-city" | "google";

/**
 * Curated gazetteer of well-known Gabonese quarters/landmarks that OSM and
 * Google often miss or mislocate. Checked FIRST (highest trust). Aliases must be
 * written normalized (lowercase, no accents, hyphens as spaces). City/province
 * use platform names; coordinates fall back to the OSM city centroid.
 */
type KnownQuarter = {
  name: string;
  aliases: string[];
  city: string;
  province: string;
  lat?: number;
  lon?: number;
};

const KNOWN_QUARTERS: KnownQuarter[] = [
  { name: "IAI", aliases: ["iai"], city: "Libreville", province: "Estuaire" },
  { name: "Amissa", aliases: ["amissa"], city: "Akanda", province: "Estuaire" },
  { name: "Balara", aliases: ["balara", "nouvelle route balara"], city: "Port-Gentil", province: "Ogooué-Maritime" },
  {
    name: "Alibandeng",
    aliases: ["alibandeng", "alibending"],
    city: "Libreville",
    province: "Estuaire",
    lat: 0.455897,
    lon: 9.42752,
  },
  {
    name: "Haut de Gué-Gué",
    aliases: ["haut de gue gue", "haut de guegue", "gue gue", "guegue"],
    city: "Libreville",
    province: "Estuaire",
    lat: 0.429447,
    lon: 9.429547,
  },
  { name: "Okala", aliases: ["okala", "okala canal7", "okala canal 7"], city: "Akanda", province: "Estuaire" },
  {
    name: "Rond-point de la Démocratie",
    aliases: ["rond point de la democratie", "rond point democratie", "carrefour democratie", "la democratie", "democratie"],
    city: "Libreville",
    province: "Estuaire",
  },
];

/** A resolved location ready to be applied onto a draft's platform fields. */
export type GeoResolution = {
  source: GeoSource;
  label: string;
  street: string;
  city: string;
  province: string;
  longitude: number;
  latitude: number;
  provinceLon?: number;
  provinceLat?: number;
  cityLon?: number;
  cityLat?: number;
  streetLon?: number;
  streetLat?: number;
  isLocExact: boolean;
};

/** Shape returned by GET /api/admin/v1/geocode. */
export type GoogleGeocodePayload =
  | { found: false }
  | {
      found: true;
      formattedAddress: string;
      latitude: number;
      longitude: number;
      province: string | null;
      city: string | null;
      quarter: string | null;
      isLocExact: boolean;
      partialMatch: boolean;
    };

// Same normalization as the platform location selector (accent/punct-insensitive).
function normalize(value: string): string {
  return deLeet(value.normalize("NFKC"))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s’'`´-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findByName<T extends { name: string }>(options: T[], value: string | null): T | null {
  if (!value) return null;
  const normalized = normalize(value);
  if (!normalized) return null;
  return options.find((option) => normalize(option.name) === normalized) ?? null;
}

function provinceOf(osm: GabonOsmSelectorData, name: string | null): GabonOsmProvinceOption | null {
  return findByName(osm.provinces, name);
}

function cityOf(osm: GabonOsmSelectorData, name: string | null): GabonOsmCityOption | null {
  return findByName(osm.cities, name);
}

// Generic toponym words that are also OSM quarter names somewhere in Gabon. On
// their own they cause cross-province false matches ("vers le carrefour" → a
// quarter literally named "Carrefour" in Omboué), so they never match alone.
const GENERIC_PLACE_WORDS = new Set([
  "carrefour",
  "marche",
  "centre",
  "centre ville",
  "cite",
  "gare",
  "rond point",
  "route",
  "place",
  "mairie",
  "ecole",
  "eglise",
  "mosquee",
  "hotel",
  "pharmacie",
  "station",
  "marche central",
  "port",
  "plage",
  "village",
  "ville",
  "zone",
  "secteur",
  "quartier",
  "terrain",
  "immeuble",
  "pk",
]);

// Longest curated alias present as a whole word in the text wins (so "rond point
// de la democratie" beats the bare "democratie").
function matchKnownQuarter(text: string): KnownQuarter | null {
  const haystack = ` ${text} `;
  let best: KnownQuarter | null = null;
  let bestLength = 0;
  for (const entry of KNOWN_QUARTERS) {
    for (const alias of entry.aliases) {
      if (haystack.includes(` ${alias} `) && alias.length > bestLength) {
        best = entry;
        bestLength = alias.length;
      }
    }
  }
  return best;
}

function buildKnownResolution(entry: KnownQuarter, osm: GabonOsmSelectorData): GeoResolution {
  const city = cityOf(osm, entry.city);
  const province = provinceOf(osm, entry.province);
  return {
    source: "known",
    label: entry.name,
    street: entry.name,
    city: city?.name ?? entry.city,
    province: province?.name ?? entry.province,
    // Precise gazetteer point if known, else the OSM city centroid (approx).
    longitude: entry.lon ?? city?.lon ?? 0,
    latitude: entry.lat ?? city?.lat ?? 0,
    streetLon: entry.lon,
    streetLat: entry.lat,
    cityLon: city?.lon,
    cityLat: city?.lat,
    provinceLon: province?.lon,
    provinceLat: province?.lat,
    isLocExact: false,
  };
}

function buildQuarterResolution(quarter: GabonOsmQuarterOption, osm: GabonOsmSelectorData): GeoResolution {
  const city = cityOf(osm, quarter.city);
  const province = provinceOf(osm, quarter.province ?? city?.province ?? null);
  return {
    source: "osm-quarter",
    label: quarter.name,
    street: quarter.name,
    city: quarter.city ?? city?.name ?? "",
    province: quarter.province ?? province?.name ?? "",
    longitude: quarter.lon,
    latitude: quarter.lat,
    streetLon: quarter.lon,
    streetLat: quarter.lat,
    cityLon: city?.lon,
    cityLat: city?.lat,
    provinceLon: province?.lon,
    provinceLat: province?.lat,
    // Quarter centroid, not an exact address point.
    isLocExact: false,
  };
}

// Common city abbreviations used in posts (normalized aliases → OSM city name).
const CITY_ALIASES: Array<{ aliases: string[]; city: string }> = [
  { aliases: ["pog", "p o g"], city: "Port-Gentil" },
  { aliases: ["lbv"], city: "Libreville" },
  { aliases: ["fcv"], city: "Franceville" },
];

function matchCityAlias(text: string, osm: GabonOsmSelectorData): GabonOsmCityOption | null {
  const haystack = ` ${text} `;
  for (const { aliases, city } of CITY_ALIASES) {
    if (aliases.some((alias) => haystack.includes(` ${alias} `))) {
      const option = cityOf(osm, city);
      if (option) return option;
    }
  }
  return null;
}

function buildCityResolution(city: GabonOsmCityOption, osm: GabonOsmSelectorData, street: string): GeoResolution {
  const province = provinceOf(osm, city.province);
  return {
    source: "osm-city",
    label: city.name,
    street,
    city: city.name,
    province: city.province ?? province?.name ?? "",
    longitude: city.lon,
    latitude: city.lat,
    cityLon: city.lon,
    cityLat: city.lat,
    provinceLon: province?.lon,
    provinceLat: province?.lat,
    isLocExact: false,
  };
}

/**
 * Resolve a draft's location from the local OSM Gabon dataset.
 *
 * Strategy, in order of trust:
 *  1. an explicit "quartier X" hint in the text, matched against OSM quarters;
 *  2. otherwise the longest non-generic quarter name found in the text;
 *  3. otherwise the longest non-generic city name.
 *
 * Whole-word matches only; names < 4 chars and {@link GENERIC_PLACE_WORDS} are
 * ignored to avoid false positives.
 */
export function resolveFromOsm(draft: ApifyListingDraft, osm: GabonOsmSelectorData): GeoResolution | null {
  // Scan the raw text too (the cleaned description drops hashtags, where a
  // quarter is sometimes the only location hint).
  const text = normalize(`${draft.source.rawText} ${draft.description} ${draft.street} ${draft.city}`);
  const haystack = ` ${text} `;

  // Longest non-generic option name (≥ 4 chars) present as a whole word in `hay`.
  const longestMatchIn = <T extends { name: string }>(options: T[], hay: string): T | null => {
    let best: T | null = null;
    let bestLength = 0;
    for (const option of options) {
      const name = normalize(option.name);
      if (name.length >= 4 && !GENERIC_PLACE_WORDS.has(name) && hay.includes(` ${name} `) && name.length > bestLength) {
        best = option;
        bestLength = name.length;
      }
    }
    return best;
  };

  // (0) Curated gazetteer wins over everything (handles quarters OSM/Google miss).
  const known = matchKnownQuarter(text);
  if (known) {
    return buildKnownResolution(known, osm);
  }

  // (1) When the post names an explicit "quartier …", trust that region: scan the
  // window right after "quartier" for a known OSM quarter name (e.g. "Quartier :
  // MAIRIE DE NZENG-AYONG" → "Nzeng-Ayong"; "quartier amissa vers le carrefour" →
  // "Amissa", not the generic "carrefour"). If none is known there, return null
  // (→ Google) rather than guessing from elsewhere in the post.
  const quarterIndex = text.indexOf("quartier");
  if (quarterIndex >= 0) {
    const region = ` ${text.slice(quarterIndex + "quartier".length, quarterIndex + 90)} `;
    const explicitQuarter = longestMatchIn<GabonOsmQuarterOption>(osm.quarters, region);
    return explicitQuarter ? buildQuarterResolution(explicitQuarter, osm) : null;
  }

  // (2) No explicit quartier: the longest non-generic quarter name found in text.
  const quarter = longestMatchIn<GabonOsmQuarterOption>(osm.quarters, haystack);
  if (quarter) {
    return buildQuarterResolution(quarter, osm);
  }

  // (3) A city abbreviation (POG → Port-Gentil, LBV → Libreville…).
  const aliasCity = matchCityAlias(text, osm);
  if (aliasCity) {
    return buildCityResolution(aliasCity, osm, draft.street);
  }

  // (4) Otherwise the longest non-generic city name found in the text.
  const city = longestMatchIn<GabonOsmCityOption>(osm.cities, haystack);
  if (city) {
    return buildCityResolution(city, osm, draft.street);
  }

  return null;
}

/** Build the Google query from the best locality hints + Gabon. */
/**
 * Candidate Google queries, most specific first. A bare quarter ("amissa,
 * Gabon") often yields ZERO_RESULTS, so we add a greater-Libreville fallback
 * (where the vast majority of these listings are) before giving up.
 */
export function buildGoogleQueries(draft: ApifyListingDraft): string[] {
  const street = draft.street.trim();
  const city = draft.city.trim();
  const province = draft.province.trim();

  const queries: string[] = [];
  const add = (...parts: string[]) => {
    const query = parts.filter(Boolean).join(", ");
    // Never geocode the bare country (would "succeed" with Gabon's centroid).
    if (query && query !== "Gabon" && !queries.includes(query)) queries.push(query);
  };

  add(street, city, province, "Gabon");
  add(street, city, "Gabon");
  if (!city) add(street, "Libreville", "Gabon");
  add(street, "Gabon");
  add(city, province, "Gabon");
  return queries;
}

/** Call the server geocode route for one query. Throws on transport/API error. */
export async function geocodeWithGoogle(query: string): Promise<GoogleGeocodePayload> {
  const response = await fetch(`/api/admin/v1/geocode?q=${encodeURIComponent(query)}`);
  const body = (await response.json()) as
    | { success: true; data: GoogleGeocodePayload }
    | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Échec du géocodage Google.");
  }
  return body.data;
}

/** Try each candidate query in order, returning the first Google hit. */
export async function geocodeBestEffort(draft: ApifyListingDraft): Promise<GoogleGeocodePayload> {
  for (const query of buildGoogleQueries(draft)) {
    const payload = await geocodeWithGoogle(query);
    if (payload.found) return payload;
  }
  return { found: false };
}

/**
 * Turn a Google geocode result into a resolution, snapping province/city onto
 * the platform's OSM names (and centroids) when they match, so persisted names
 * stay consistent with the rest of the platform.
 */
export function resolveFromGoogle(
  draft: ApifyListingDraft,
  payload: GoogleGeocodePayload,
  osm: GabonOsmSelectorData,
): GeoResolution | null {
  if (!payload.found) return null;

  const province = provinceOf(osm, payload.province);
  const city = cityOf(osm, payload.city);

  return {
    source: "google",
    label: payload.quarter ?? payload.city ?? payload.formattedAddress,
    street: payload.quarter ?? draft.street,
    city: city?.name ?? payload.city ?? "",
    province: province?.name ?? payload.province ?? "",
    longitude: payload.longitude,
    latitude: payload.latitude,
    streetLon: payload.longitude,
    streetLat: payload.latitude,
    cityLon: city?.lon,
    cityLat: city?.lat,
    provinceLon: province?.lon,
    provinceLat: province?.lat,
    isLocExact: payload.isLocExact,
  };
}

/** Apply a resolution onto a draft, returning a new draft with location filled. */
export function applyResolution(draft: ApifyListingDraft, resolution: GeoResolution): ApifyListingDraft {
  const next: ApifyListingDraft = {
    ...draft,
    street: resolution.street || draft.street,
    city: resolution.city || draft.city,
    province: resolution.province || draft.province,
    longitude: resolution.longitude,
    latitude: resolution.latitude,
    isLocExact: resolution.isLocExact,
    provinceLon: resolution.provinceLon,
    provinceLat: resolution.provinceLat,
    cityLon: resolution.cityLon,
    cityLat: resolution.cityLat,
    streetLon: resolution.streetLon,
    streetLat: resolution.streetLat,
  };
  // Refresh title + description so they reflect the resolved (canonical) locality.
  return { ...next, ...buildListingContent(next) };
}
