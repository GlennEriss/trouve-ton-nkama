import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { GabonOsmCityOption, GabonOsmQuarterOption } from "@/modules/location-osm/domain/types";

const COLLECTION_CITIES = "geo_cities";
const COLLECTION_QUARTERS = "geo_quarters";
const DEFAULT_COUNTRY_NAME = "Gabon";
const DEFAULT_COUNTRY_ISO2 = "GA";

type GeoCityDoc = {
  source?: unknown;
  name?: unknown;
  normalizedName?: unknown;
  province?: unknown;
  normalizedProvince?: unknown;
  lat?: unknown;
  lon?: unknown;
  countryName?: unknown;
  countryIso2?: unknown;
};

type GeoQuarterDoc = {
  source?: unknown;
  name?: unknown;
  aliases?: unknown;
  normalizedName?: unknown;
  city?: unknown;
  province?: unknown;
  normalizedCity?: unknown;
  normalizedProvince?: unknown;
  lat?: unknown;
  lon?: unknown;
  countryName?: unknown;
  countryIso2?: unknown;
};

type CreateCityInput = {
  name: string;
  province: string;
  lat: number;
  lon: number;
};

type UpdateCityInput = {
  cityId: string;
  patch: {
    name?: string;
    province?: string;
    lat?: number;
    lon?: number;
  };
};

type CreateQuarterInput = {
  name: string;
  aliases?: string[];
  city: string;
  province: string;
  lat: number;
  lon: number;
};

type UpdateQuarterInput = {
  quarterId: string;
  patch: {
    name?: string;
    aliases?: string[];
    city?: string;
    province?: string;
    lat?: number;
    lon?: number;
  };
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

function normalizeName(value: string) {
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
    .map((part) => (part ? normalizeName(part) : ""))
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

function parseCityDoc(docId: string, data: GeoCityDoc): GabonOsmCityOption | null {
  const name = toSafeString(data.name);
  const lat = toSafeNumber(data.lat);
  const lon = toSafeNumber(data.lon);
  if (!name || lat == null || lon == null) {
    return null;
  }
  return {
    id: docId,
    name,
    province: toSafeString(data.province),
    lat,
    lon,
  };
}

function parseQuarterDoc(docId: string, data: GeoQuarterDoc): GabonOsmQuarterOption | null {
  const name = toSafeString(data.name);
  const lat = toSafeNumber(data.lat);
  const lon = toSafeNumber(data.lon);
  if (!name || lat == null || lon == null) {
    return null;
  }
  return {
    id: docId,
    name,
    aliases: toSafeStringArray(data.aliases),
    city: toSafeString(data.city),
    province: toSafeString(data.province),
    lat,
    lon,
  };
}

function sanitizeName(raw: string, field: string) {
  const value = raw.trim();
  if (!value) {
    throw new Error(`${field}_REQUIRED`);
  }
  if (value.length < 2 || value.length > 120) {
    throw new Error(`${field}_INVALID`);
  }
  return value;
}

function sanitizeAliases(raw: string[] | undefined, canonicalName: string) {
  const canonical = normalizeName(canonicalName);
  const unique = new Map<string, string>();
  for (const entry of raw ?? []) {
    const alias = sanitizeName(entry, "QUARTER_ALIAS");
    const normalized = normalizeName(alias);
    if (normalized !== canonical) unique.set(normalized, alias);
  }
  if (unique.size > 20) throw new Error("QUARTER_ALIASES_INVALID");
  return Array.from(unique.values());
}

function sanitizeCoordinate(raw: number, field: "lat" | "lon") {
  if (!Number.isFinite(raw)) {
    throw new Error(`CITY_${field.toUpperCase()}_INVALID`);
  }
  return raw;
}

function sanitizeQuarterCoordinate(raw: number, field: "lat" | "lon") {
  if (!Number.isFinite(raw)) {
    throw new Error(`QUARTER_${field.toUpperCase()}_INVALID`);
  }
  return raw;
}

export async function createGeoCity(input: CreateCityInput): Promise<GabonOsmCityOption> {
  const name = sanitizeName(input.name, "CITY_NAME");
  const province = sanitizeName(input.province, "CITY_PROVINCE");
  const lat = sanitizeCoordinate(input.lat, "lat");
  const lon = sanitizeCoordinate(input.lon, "lon");

  const normalizedName = normalizeName(name);
  const normalizedProvince = normalizeName(province);
  const cityId = buildDocId(name, province);
  const db = getFirebaseAdminDb();

  const sameNameSnapshot = await db.collection(COLLECTION_CITIES).where("normalizedName", "==", normalizedName).get();
  const hasDuplicate = sameNameSnapshot.docs.some((doc) => {
    const data = doc.data() as GeoCityDoc;
    return toSafeString(data.normalizedProvince) === normalizedProvince;
  });
  if (hasDuplicate) {
    throw new Error("CITY_ALREADY_EXISTS");
  }

  const cityRef = db.collection(COLLECTION_CITIES).doc(cityId);
  const existing = await cityRef.get();
  if (existing.exists) {
    throw new Error("CITY_ALREADY_EXISTS");
  }

  await cityRef.set({
    source: "manual",
    name,
    normalizedName,
    province,
    normalizedProvince,
    lat,
    lon,
    countryName: DEFAULT_COUNTRY_NAME,
    countryIso2: DEFAULT_COUNTRY_ISO2,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    id: cityId,
    name,
    province,
    lat,
    lon,
  };
}

export async function updateGeoCity(input: UpdateCityInput): Promise<GabonOsmCityOption | null> {
  const cityId = input.cityId.trim();
  if (!cityId) {
    throw new Error("CITY_INVALID_ID");
  }

  const db = getFirebaseAdminDb();
  const cityRef = db.collection(COLLECTION_CITIES).doc(cityId);
  const currentSnapshot = await cityRef.get();
  if (!currentSnapshot.exists) {
    return null;
  }

  const currentData = currentSnapshot.data() as GeoCityDoc;
  const currentParsed = parseCityDoc(cityId, currentData);
  if (!currentParsed) {
    throw new Error("CITY_INVALID_DOCUMENT");
  }

  const nextName = input.patch.name != null ? sanitizeName(input.patch.name, "CITY_NAME") : currentParsed.name;
  const nextProvince = input.patch.province != null ? sanitizeName(input.patch.province, "CITY_PROVINCE") : currentParsed.province ?? "";
  const nextLat = input.patch.lat != null ? sanitizeCoordinate(input.patch.lat, "lat") : currentParsed.lat;
  const nextLon = input.patch.lon != null ? sanitizeCoordinate(input.patch.lon, "lon") : currentParsed.lon;

  if (
    nextName === currentParsed.name &&
    nextProvince === (currentParsed.province ?? "") &&
    nextLat === currentParsed.lat &&
    nextLon === currentParsed.lon
  ) {
    throw new Error("CITY_EMPTY_PATCH");
  }

  const nextId = buildDocId(nextName, nextProvince);
  if (nextId !== cityId) {
    const nextRef = db.collection(COLLECTION_CITIES).doc(nextId);
    const exists = await nextRef.get();
    if (exists.exists) {
      throw new Error("CITY_ALREADY_EXISTS");
    }
  }

  const nextNormalizedName = normalizeName(nextName);
  const nextNormalizedProvince = normalizeName(nextProvince);
  const currentNormalizedName = normalizeName(currentParsed.name);
  const currentNormalizedProvince = currentParsed.province ? normalizeName(currentParsed.province) : null;

  const quartersWithCity = await db
    .collection(COLLECTION_QUARTERS)
    .where("normalizedCity", "==", currentNormalizedName)
    .get();

  const batch = db.batch();
  const cityPayload = {
    source: "manual",
    name: nextName,
    normalizedName: nextNormalizedName,
    province: nextProvince,
    normalizedProvince: nextNormalizedProvince,
    lat: nextLat,
    lon: nextLon,
    countryName: DEFAULT_COUNTRY_NAME,
    countryIso2: DEFAULT_COUNTRY_ISO2,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (nextId === cityId) {
    batch.set(cityRef, cityPayload, { merge: true });
  } else {
    batch.set(db.collection(COLLECTION_CITIES).doc(nextId), {
      ...cityPayload,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.delete(cityRef);
  }

  for (const quarterDoc of quartersWithCity.docs) {
    const quarterData = quarterDoc.data() as GeoQuarterDoc;
    const quarterNormalizedProvince = toSafeString(quarterData.normalizedProvince);
    const shouldUpdateProvince =
      currentNormalizedProvince == null || quarterNormalizedProvince === currentNormalizedProvince;

    batch.set(
      quarterDoc.ref,
      {
        city: nextName,
        normalizedCity: nextNormalizedName,
        province: shouldUpdateProvince ? nextProvince : quarterData.province,
        normalizedProvince: shouldUpdateProvince ? nextNormalizedProvince : quarterData.normalizedProvince,
        source: "manual",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();

  return {
    id: nextId,
    name: nextName,
    province: nextProvince,
    lat: nextLat,
    lon: nextLon,
  };
}

export async function removeGeoCity(cityIdRaw: string): Promise<{ city: GabonOsmCityOption; deletedQuarters: number } | null> {
  const cityId = cityIdRaw.trim();
  if (!cityId) {
    throw new Error("CITY_INVALID_ID");
  }

  const db = getFirebaseAdminDb();
  const cityRef = db.collection(COLLECTION_CITIES).doc(cityId);
  const citySnapshot = await cityRef.get();
  if (!citySnapshot.exists) {
    return null;
  }

  const cityData = citySnapshot.data() as GeoCityDoc;
  const city = parseCityDoc(cityId, cityData);
  if (!city) {
    throw new Error("CITY_INVALID_DOCUMENT");
  }

  const normalizedCity = normalizeName(city.name);
  const normalizedProvince = city.province ? normalizeName(city.province) : null;
  const linkedQuartersSnapshot = await db
    .collection(COLLECTION_QUARTERS)
    .where("normalizedCity", "==", normalizedCity)
    .get();

  const batch = db.batch();
  batch.delete(cityRef);
  let deletedQuarters = 0;

  for (const quarterDoc of linkedQuartersSnapshot.docs) {
    const data = quarterDoc.data() as GeoQuarterDoc;
    const quarterNormalizedProvince = toSafeString(data.normalizedProvince);
    const shouldDelete =
      normalizedProvince == null || quarterNormalizedProvince === normalizedProvince;
    if (shouldDelete) {
      batch.delete(quarterDoc.ref);
      deletedQuarters += 1;
    }
  }

  await batch.commit();
  return { city, deletedQuarters };
}

export async function createGeoQuarter(input: CreateQuarterInput): Promise<GabonOsmQuarterOption> {
  const name = sanitizeName(input.name, "QUARTER_NAME");
  const aliases = sanitizeAliases(input.aliases, name);
  const city = sanitizeName(input.city, "QUARTER_CITY");
  const province = sanitizeName(input.province, "QUARTER_PROVINCE");
  const lat = sanitizeQuarterCoordinate(input.lat, "lat");
  const lon = sanitizeQuarterCoordinate(input.lon, "lon");

  const normalizedName = normalizeName(name);
  const normalizedCity = normalizeName(city);
  const normalizedProvince = normalizeName(province);
  const quarterId = buildQuarterDocId(name, city, province, lat, lon);
  const db = getFirebaseAdminDb();

  const sameNameSnapshot = await db.collection(COLLECTION_QUARTERS).where("normalizedName", "==", normalizedName).get();
  const hasDuplicate = sameNameSnapshot.docs.some((doc) => {
    const data = doc.data() as GeoQuarterDoc;
    return (
      toSafeString(data.normalizedCity) === normalizedCity &&
      toSafeString(data.normalizedProvince) === normalizedProvince
    );
  });
  if (hasDuplicate) {
    throw new Error("QUARTER_ALREADY_EXISTS");
  }

  const quarterRef = db.collection(COLLECTION_QUARTERS).doc(quarterId);
  const existing = await quarterRef.get();
  if (existing.exists) {
    throw new Error("QUARTER_ALREADY_EXISTS");
  }

  await quarterRef.set({
    source: "manual",
    name,
    aliases,
    normalizedName,
    city,
    province,
    normalizedCity,
    normalizedProvince,
    lat,
    lon,
    countryName: DEFAULT_COUNTRY_NAME,
    countryIso2: DEFAULT_COUNTRY_ISO2,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    id: quarterId,
    name,
    aliases,
    city,
    province,
    lat,
    lon,
  };
}

export async function updateGeoQuarter(input: UpdateQuarterInput): Promise<GabonOsmQuarterOption | null> {
  const quarterId = input.quarterId.trim();
  if (!quarterId) {
    throw new Error("QUARTER_INVALID_ID");
  }

  const db = getFirebaseAdminDb();
  const quarterRef = db.collection(COLLECTION_QUARTERS).doc(quarterId);
  const currentSnapshot = await quarterRef.get();
  if (!currentSnapshot.exists) {
    return null;
  }

  const currentData = currentSnapshot.data() as GeoQuarterDoc;
  const current = parseQuarterDoc(quarterId, currentData);
  if (!current) {
    throw new Error("QUARTER_INVALID_DOCUMENT");
  }

  const nextName = input.patch.name != null ? sanitizeName(input.patch.name, "QUARTER_NAME") : current.name;
  const nextAliases = input.patch.aliases != null
    ? sanitizeAliases(input.patch.aliases, nextName)
    : current.aliases;
  const nextCity = input.patch.city != null ? sanitizeName(input.patch.city, "QUARTER_CITY") : current.city ?? "";
  const nextProvince =
    input.patch.province != null ? sanitizeName(input.patch.province, "QUARTER_PROVINCE") : current.province ?? "";
  const nextLat = input.patch.lat != null ? sanitizeQuarterCoordinate(input.patch.lat, "lat") : current.lat;
  const nextLon = input.patch.lon != null ? sanitizeQuarterCoordinate(input.patch.lon, "lon") : current.lon;

  if (
    nextName === current.name &&
    JSON.stringify(nextAliases) === JSON.stringify(current.aliases) &&
    nextCity === (current.city ?? "") &&
    nextProvince === (current.province ?? "") &&
    nextLat === current.lat &&
    nextLon === current.lon
  ) {
    throw new Error("QUARTER_EMPTY_PATCH");
  }

  const nextId = buildQuarterDocId(nextName, nextCity, nextProvince, nextLat, nextLon);
  if (nextId !== quarterId) {
    const nextRef = db.collection(COLLECTION_QUARTERS).doc(nextId);
    const exists = await nextRef.get();
    if (exists.exists) {
      throw new Error("QUARTER_ALREADY_EXISTS");
    }
  }

  const payload = {
    source: "manual",
    name: nextName,
    aliases: nextAliases,
    normalizedName: normalizeName(nextName),
    city: nextCity,
    province: nextProvince,
    normalizedCity: normalizeName(nextCity),
    normalizedProvince: normalizeName(nextProvince),
    lat: nextLat,
    lon: nextLon,
    countryName: DEFAULT_COUNTRY_NAME,
    countryIso2: DEFAULT_COUNTRY_ISO2,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  if (nextId === quarterId) {
    batch.set(quarterRef, payload, { merge: true });
  } else {
    batch.set(db.collection(COLLECTION_QUARTERS).doc(nextId), {
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.delete(quarterRef);
  }
  await batch.commit();

  return {
    id: nextId,
    name: nextName,
    aliases: nextAliases,
    city: nextCity,
    province: nextProvince,
    lat: nextLat,
    lon: nextLon,
  };
}

export async function removeGeoQuarter(quarterIdRaw: string): Promise<GabonOsmQuarterOption | null> {
  const quarterId = quarterIdRaw.trim();
  if (!quarterId) {
    throw new Error("QUARTER_INVALID_ID");
  }

  const db = getFirebaseAdminDb();
  const quarterRef = db.collection(COLLECTION_QUARTERS).doc(quarterId);
  const snapshot = await quarterRef.get();
  if (!snapshot.exists) {
    return null;
  }
  const quarter = parseQuarterDoc(quarterId, snapshot.data() as GeoQuarterDoc);
  if (!quarter) {
    throw new Error("QUARTER_INVALID_DOCUMENT");
  }
  await quarterRef.delete();
  return quarter;
}
