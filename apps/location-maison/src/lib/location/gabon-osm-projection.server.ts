import "server-only";

import type { App } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import type { OSMLocationsSerializable } from "@/data/gabon-osm-locations";
import { adminApp } from "@/firebase/admin";

const COLLECTION_PROVINCES = "geo_provinces";
const COLLECTION_CITIES = "geo_cities";
const COLLECTION_QUARTERS = "geo_quarters";
const COLLECTION_META = "geo_osm_meta";
const META_DOC_ID = "gabon";

const DEFAULT_COUNTRY_NAME = "Gabon";
const DEFAULT_COUNTRY_ISO2 = "GA";
const DEFAULT_SOURCE_PATH = "firestore://geo_projection/gabon";

export type GabonOsmProjectionSource = {
  mode: "cloud" | "local";
  sourcePath: string;
  sourceBucket: string | null;
  sourceObjectPath: string | null;
  sourceUpdatedAt: string | null;
};

type GeoProvinceDoc = {
  name?: unknown;
  lat?: unknown;
  lon?: unknown;
};

type GeoCityDoc = {
  name?: unknown;
  province?: unknown;
  lat?: unknown;
  lon?: unknown;
};

type GeoQuarterDoc = {
  name?: unknown;
  aliases?: unknown;
  city?: unknown;
  province?: unknown;
  lat?: unknown;
  lon?: unknown;
};

type GeoMetaDoc = {
  countryName?: unknown;
  countryIso2?: unknown;
  sourceMode?: unknown;
  sourcePath?: unknown;
  sourceBucket?: unknown;
  sourceObjectPath?: unknown;
  sourceUpdatedAt?: unknown;
  projectionUpdatedAt?: unknown;
};

function toSafeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toSafeNumber(value: unknown) {
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

function toSafeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(toSafeString).filter((item): item is string => Boolean(item));
}

function toIsoDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isProjectionPreferred() {
  const defaultPreference = process.env.NODE_ENV === "production" ? "true" : "false";
  return !["0", "false", "no"].includes(
    (process.env.OSM_SELECTOR_PREFER_PROJECTION ?? defaultPreference).trim().toLowerCase(),
  );
}

export function shouldPreferGabonOsmProjectionServer() {
  return isProjectionPreferred();
}

export async function loadGabonOsmProjectionSerializableServer(): Promise<{
  data: OSMLocationsSerializable;
  source: GabonOsmProjectionSource;
} | null> {
  const db = getFirestore(adminApp as App);

  const [metaSnapshot, provinceSnapshot, citySnapshot, quarterSnapshot] = await Promise.all([
    db.collection(COLLECTION_META).doc(META_DOC_ID).get(),
    db.collection(COLLECTION_PROVINCES).get(),
    db.collection(COLLECTION_CITIES).get(),
    db.collection(COLLECTION_QUARTERS).get(),
  ]);

  if (provinceSnapshot.empty && citySnapshot.empty && quarterSnapshot.empty) {
    return null;
  }

  const meta = metaSnapshot.exists ? (metaSnapshot.data() as GeoMetaDoc) : null;
  const countryName = toSafeString(meta?.countryName) ?? DEFAULT_COUNTRY_NAME;
  const countryIso2 = (toSafeString(meta?.countryIso2) ?? DEFAULT_COUNTRY_ISO2).toUpperCase();

  const provinces = provinceSnapshot.docs
    .map((doc) => {
      const data = doc.data() as GeoProvinceDoc;
      const name = toSafeString(data.name);
      const lat = toSafeNumber(data.lat);
      const lon = toSafeNumber(data.lon);
      if (!name || lat == null || lon == null) {
        return null;
      }
      return {
        name,
        lat,
        lon,
        type: "province" as const,
        osmId: hashString(`province:${name}`),
        osmType: "relation" as const,
        source: "admin_boundaries" as const,
        originalType: "projection",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));

  const cities = citySnapshot.docs
    .map((doc) => {
      const data = doc.data() as GeoCityDoc;
      const name = toSafeString(data.name);
      const lat = toSafeNumber(data.lat);
      const lon = toSafeNumber(data.lon);
      if (!name || lat == null || lon == null) {
        return null;
      }
      return {
        name,
        province: toSafeString(data.province),
        lat,
        lon,
        type: "city" as const,
        osmId: hashString(`city:${name}:${toSafeString(data.province) ?? ""}`),
        osmType: "relation" as const,
        source: "places" as const,
        originalType: "projection",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));

  const quarters = quarterSnapshot.docs
    .map((doc) => {
      const data = doc.data() as GeoQuarterDoc;
      const name = toSafeString(data.name);
      const lat = toSafeNumber(data.lat);
      const lon = toSafeNumber(data.lon);
      if (!name || lat == null || lon == null) {
        return null;
      }
      return {
        name,
        aliases: toSafeStringArray(data.aliases),
        city: toSafeString(data.city),
        province: toSafeString(data.province),
        lat,
        lon,
        type: "quarter" as const,
        osmId: hashString(
          `quarter:${name}:${toSafeString(data.city) ?? ""}:${toSafeString(data.province) ?? ""}:${lat}:${lon}`,
        ),
        osmType: "relation" as const,
        source: "places" as const,
        originalType: "projection",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));

  if (provinces.length === 0 && cities.length === 0 && quarters.length === 0) {
    return null;
  }

  const cityToProvince: Record<string, string> = {};
  for (const city of cities) {
    if (city.province) {
      cityToProvince[city.name] = city.province;
    }
  }

  const quarterToCity: Record<string, string> = {};
  const quarterToProvince: Record<string, string> = {};
  for (const quarter of quarters) {
    if (quarter.city) {
      quarterToCity[quarter.name] = quarter.city;
    }
    if (quarter.province) {
      quarterToProvince[quarter.name] = quarter.province;
    }
  }

  return {
    data: {
      provinces,
      cities: cities.map(({ province, ...rest }) => rest),
      quarters: quarters.map(({ city, province, ...rest }) => rest),
      cityToProvince,
      quarterToCity,
      quarterToProvince,
    },
    source: {
      mode: (toSafeString(meta?.sourceMode) ?? "cloud") as "cloud" | "local",
      sourcePath: toSafeString(meta?.sourcePath) ?? DEFAULT_SOURCE_PATH,
      sourceBucket: toSafeString(meta?.sourceBucket),
      sourceObjectPath: toSafeString(meta?.sourceObjectPath),
      sourceUpdatedAt:
        toIsoDate(meta?.sourceUpdatedAt) ??
        toIsoDate(meta?.projectionUpdatedAt) ??
        null,
    },
  };
}

export function getProjectionCountryFallback() {
  return {
    name: DEFAULT_COUNTRY_NAME,
    iso2: DEFAULT_COUNTRY_ISO2,
  };
}

export function getProjectionCountryMeta(meta: GeoMetaDoc | null | undefined) {
  return {
    name: toSafeString(meta?.countryName) ?? DEFAULT_COUNTRY_NAME,
    iso2: (toSafeString(meta?.countryIso2) ?? DEFAULT_COUNTRY_ISO2).toUpperCase(),
  };
}
