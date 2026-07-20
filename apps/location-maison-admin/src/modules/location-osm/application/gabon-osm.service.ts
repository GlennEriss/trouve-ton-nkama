import {
  loadGabonOsmRoot,
  type GabonOsmRootSource,
} from "@/modules/location-osm/application/gabon-osm-root-loader";
import type {
  GabonOsmQuarterOption,
  GabonOsmSelectorData,
} from "@/modules/location-osm/domain/types";

type OsmRecord = Record<string, unknown>;

type OsmPlace = {
  name: string;
  normalizedName: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

type OsmQuarter = OsmPlace & {
  city: string | null;
  province: string | null;
  normalizedCity: string | null;
  normalizedProvince: string | null;
};

export type {
  GabonOsmCityOption,
  GabonOsmProvinceOption,
  GabonOsmQuarterOption,
  GabonOsmSelectorData,
} from "@/modules/location-osm/domain/types";

const DEFAULT_COUNTRY_NAME = "Gabon";
const DEFAULT_COUNTRY_ISO2 = "GA";

let cachedData: GabonOsmSelectorData | null = null;
let cachedSignature: string | null = null;

function toOsmRecord(value: unknown): OsmRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as OsmRecord;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function parseOsmText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOsmName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s’'`´-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDocId(...parts: Array<string | null | undefined>) {
  const normalized = parts
    .map((part) => (part ? normalizeOsmName(part) : ""))
    .filter(Boolean)
    .join("__");
  return normalized || "unknown";
}

function buildQuarterDocId(
  name: string,
  city: string | null,
  province: string | null,
  lat: number,
  lon: number,
) {
  return `${buildDocId(name, city, province)}__${lat.toFixed(5)}_${lon.toFixed(5)}`;
}

function parseOsmPlace(element: unknown): OsmPlace | null {
  const record = toOsmRecord(element);
  if (!record) {
    return null;
  }
  const names = toOsmRecord(record.names);
  const name = parseOsmText(names?.fr) ?? parseOsmText(record.name) ?? parseOsmText(names?.en);
  if (!name) {
    return null;
  }
  const center = toOsmRecord(record.center);
  const lat = toFiniteNumber(center?.lat);
  const lon = toFiniteNumber(center?.lon);
  if (lat == null || lon == null) {
    return null;
  }
  const tagsRecord = toOsmRecord(record.tags);
  const tags: Record<string, string> = {};
  if (tagsRecord) {
    for (const [key, rawValue] of Object.entries(tagsRecord)) {
      const parsed = parseOsmText(rawValue);
      if (parsed) {
        tags[key] = parsed;
      }
    }
  }
  return {
    name,
    normalizedName: normalizeOsmName(name),
    lat,
    lon,
    tags,
  };
}

function collectOsmList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as OsmPlace[];
  }
  const list: OsmPlace[] = [];
  for (const item of value) {
    const parsed = parseOsmPlace(item);
    if (parsed) {
      list.push(parsed);
    }
  }
  return list;
}

function dedupePlacesByKey(items: OsmPlace[], getKey: (item: OsmPlace) => string) {
  const map = new Map<string, OsmPlace>();
  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function geoDistanceSquared(aLat: number, aLon: number, bLat: number, bLon: number) {
  const latDelta = aLat - bLat;
  const lonDelta = aLon - bLon;
  return latDelta * latDelta + lonDelta * lonDelta;
}

function findNearestPlace(source: { lat: number; lon: number }, places: OsmPlace[]) {
  let best: OsmPlace | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const place of places) {
    const distance = geoDistanceSquared(source.lat, source.lon, place.lat, place.lon);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = place;
    }
  }
  return best;
}

function buildOsmSelectorData(root: OsmRecord, source: GabonOsmRootSource): GabonOsmSelectorData {
  const country = toOsmRecord(root.country);
  const countryName = parseOsmText(country?.name) ?? DEFAULT_COUNTRY_NAME;
  const countryIso2 = (parseOsmText(country?.iso2) ?? DEFAULT_COUNTRY_ISO2).toUpperCase();

  const adminBoundaries = toOsmRecord(root.admin_boundaries);
  const places = toOsmRecord(root.places);

  const provinces = dedupePlacesByKey(collectOsmList(adminBoundaries?.["4"]), (item) => item.normalizedName);
  const cities = dedupePlacesByKey(
    [
      ...collectOsmList(places?.city),
      ...collectOsmList(places?.town),
      ...collectOsmList(adminBoundaries?.["6"]),
      ...collectOsmList(adminBoundaries?.["8"]),
    ],
    (item) => item.normalizedName,
  );

  const provinceByNormalizedName = new Map<string, string>();
  for (const province of provinces) {
    provinceByNormalizedName.set(province.normalizedName, province.name);
  }

  const cityToProvince = new Map<string, string>();
  for (const city of cities) {
    const provinceFromTagsRaw = parseOsmText(city.tags["addr:province"]);
    if (provinceFromTagsRaw) {
      const normalizedProvince = normalizeOsmName(provinceFromTagsRaw);
      const canonicalProvince =
        provinceByNormalizedName.get(normalizedProvince) ??
        provinces.find((candidate) => candidate.normalizedName.includes(normalizedProvince))?.name ??
        provinceFromTagsRaw;
      cityToProvince.set(city.name, canonicalProvince);
      continue;
    }
    const nearestProvince = findNearestPlace(city, provinces);
    if (nearestProvince) {
      cityToProvince.set(city.name, nearestProvince.name);
    }
  }

  const quarterRawItems = [
    ...collectOsmList(places?.suburb),
    ...collectOsmList(places?.neighbourhood),
    ...collectOsmList(places?.quarter),
    ...collectOsmList(places?.locality),
    ...collectOsmList(places?.village),
    ...collectOsmList(places?.hamlet),
    ...collectOsmList(adminBoundaries?.["9"]),
    ...collectOsmList(adminBoundaries?.["10"]),
  ];

  const quarters: OsmQuarter[] = quarterRawItems.map((quarter) => {
    const rawCity = parseOsmText(quarter.tags["addr:city"]);
    const rawProvince = parseOsmText(quarter.tags["addr:province"]);

    const normalizedCity = rawCity ? normalizeOsmName(rawCity) : null;
    const normalizedProvince = rawProvince ? normalizeOsmName(rawProvince) : null;

    const cityFromTags =
      (normalizedCity ? cities.find((entry) => entry.normalizedName === normalizedCity)?.name : null) ??
      (normalizedCity
        ? cities.find((entry) => entry.normalizedName.includes(normalizedCity))?.name ?? null
        : null);
    const nearestCity = cityFromTags ? null : findNearestPlace(quarter, cities);
    const city = cityFromTags ?? nearestCity?.name ?? null;

    const provinceFromTags =
      (normalizedProvince ? provinceByNormalizedName.get(normalizedProvince) : null) ??
      (normalizedProvince
        ? provinces.find((entry) => entry.normalizedName.includes(normalizedProvince))?.name ?? null
        : null);
    const provinceFromCity = city ? cityToProvince.get(city) ?? null : null;
    const nearestProvince =
      provinceFromTags || provinceFromCity ? null : findNearestPlace(quarter, provinces);
    const province = provinceFromTags ?? provinceFromCity ?? nearestProvince?.name ?? null;

    return {
      ...quarter,
      city,
      province,
      normalizedCity: city ? normalizeOsmName(city) : null,
      normalizedProvince: province ? normalizeOsmName(province) : null,
    };
  });

  const cityOptions = dedupePlacesByKey(
    cities.map((city) => ({
      ...city,
      tags: {
        ...city.tags,
        "__province": cityToProvince.get(city.name) ?? "",
      },
    })),
    (item) => `${item.normalizedName}|${normalizeOsmName(item.tags["__province"] || "")}`,
  ).map((city) => ({
    name: city.name,
    province: parseOsmText(city.tags["__province"]),
    lat: city.lat,
    lon: city.lon,
  }));

  const quarterMap = new Map<string, GabonOsmQuarterOption>();
  for (const quarter of quarters) {
    const key = [
      quarter.normalizedName,
      quarter.normalizedCity ?? "",
      quarter.normalizedProvince ?? "",
    ].join("|");
    if (!quarterMap.has(key)) {
      quarterMap.set(key, {
        id: buildQuarterDocId(
          quarter.name,
          quarter.city,
          quarter.province,
          quarter.lat,
          quarter.lon,
        ),
        name: quarter.name,
        aliases: [],
        city: quarter.city,
        province: quarter.province,
        lat: quarter.lat,
        lon: quarter.lon,
      });
    }
  }

  return {
    country: {
      name: countryName,
      iso2: countryIso2,
    },
    sourceMode: source.mode,
    sourcePath: source.sourcePath,
    sourceBucket: source.sourceBucket,
    sourceObjectPath: source.sourceObjectPath,
    sourceUpdatedAt: source.sourceUpdatedAt,
    provinces: provinces
      .map((province) => ({
        id: buildDocId(province.name),
        name: province.name,
        lat: province.lat,
        lon: province.lon,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    cities: cityOptions
      .map((city) => ({
        id: buildDocId(city.name, city.province ?? ""),
        ...city,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    quarters: Array.from(quarterMap.values()).sort((a, b) => a.name.localeCompare(b.name, "fr")),
  };
}

function buildSourceSignature(source: GabonOsmRootSource) {
  return [
    source.mode,
    source.sourcePath,
    source.sourceUpdatedAt ?? "",
  ].join("|");
}

export async function getGabonOsmSelectorDataFromRoot(forceRefresh = false) {
  try {
    const loaded = await loadGabonOsmRoot(forceRefresh);
    if (!loaded) {
      cachedData = null;
      cachedSignature = null;
      return null;
    }

    const signature = buildSourceSignature(loaded.source);
    if (!forceRefresh && cachedData && cachedSignature === signature) {
      return cachedData;
    }

    cachedData = buildOsmSelectorData(loaded.root, loaded.source);
    cachedSignature = signature;
    return cachedData;
  } catch {
    cachedData = null;
    cachedSignature = null;
    return null;
  }
}

export async function getGabonOsmSelectorData(forceRefresh = false) {
  return getGabonOsmSelectorDataFromRoot(forceRefresh);
}
