import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import { getGabonOsmSelectorDataFromRoot } from "@/modules/location-osm/application/gabon-osm.service";
import type {
  GabonOsmProjectionSyncResult,
  GabonOsmSelectorData,
  GabonOsmSourceMode,
} from "@/modules/location-osm/domain/types";

const COLLECTION_PROVINCES = "geo_provinces";
const COLLECTION_CITIES = "geo_cities";
const COLLECTION_QUARTERS = "geo_quarters";
const COLLECTION_META = "geo_osm_meta";
const META_DOC_ID = "gabon";

const BATCH_WRITE_LIMIT = 450;
const DEFAULT_COUNTRY_NAME = "Gabon";
const DEFAULT_COUNTRY_ISO2 = "GA";
const DEFAULT_SOURCE_PATH = "firestore://geo_projection/gabon";

export function shouldPreferGabonOsmProjection() {
  return !["0", "false", "no"].includes(
    (process.env.OSM_SELECTOR_PREFER_PROJECTION ?? "true").trim().toLowerCase(),
  );
}

type GeoProvinceDoc = {
  source?: unknown;
  name?: unknown;
  normalizedName?: unknown;
  lat?: unknown;
  lon?: unknown;
  countryName?: unknown;
  countryIso2?: unknown;
};

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

type GeoMetaDoc = {
  countryName?: unknown;
  countryIso2?: unknown;
  sourceMode?: unknown;
  sourcePath?: unknown;
  sourceBucket?: unknown;
  sourceObjectPath?: unknown;
  sourceUpdatedAt?: unknown;
  projectionUpdatedAt?: unknown;
  counts?: unknown;
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

async function readProjectionCollectionDocs(collectionName: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    source: toSafeString((doc.data() as { source?: unknown }).source),
  }));
}

type WriteOperation =
  | { type: "set"; collectionName: string; docId: string; data: Record<string, unknown> }
  | { type: "delete"; collectionName: string; docId: string };

async function commitWriteOperations(operations: WriteOperation[]) {
  const db = getFirebaseAdminDb();
  let index = 0;
  while (index < operations.length) {
    const batch = db.batch();
    const chunk = operations.slice(index, index + BATCH_WRITE_LIMIT);
    for (const operation of chunk) {
      const ref = db.collection(operation.collectionName).doc(operation.docId);
      if (operation.type === "set") {
        batch.set(ref, operation.data);
      } else {
        batch.delete(ref);
      }
    }
    await batch.commit();
    index += BATCH_WRITE_LIMIT;
  }
}

export async function getGabonOsmSelectorDataFromProjection(): Promise<GabonOsmSelectorData | null> {
  const db = getFirebaseAdminDb();
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
  const sourceMode = (toSafeString(meta?.sourceMode) ?? "cloud") as GabonOsmSourceMode;
  const sourcePath = toSafeString(meta?.sourcePath) ?? DEFAULT_SOURCE_PATH;
  const sourceBucket = toSafeString(meta?.sourceBucket);
  const sourceObjectPath = toSafeString(meta?.sourceObjectPath);
  const sourceUpdatedAt =
    toIsoDate(meta?.sourceUpdatedAt) ??
    toIsoDate(meta?.projectionUpdatedAt) ??
    null;

  const provinces = provinceSnapshot.docs
    .map((doc) => {
      const data = doc.data() as GeoProvinceDoc;
      const name = toSafeString(data.name);
      const lat = toSafeNumber(data.lat);
      const lon = toSafeNumber(data.lon);
      if (!name || lat == null || lon == null) {
        return null;
      }
      return { name, lat, lon };
    })
    .filter((item): item is { name: string; lat: number; lon: number } => Boolean(item))
    .map((item) => ({
      id: buildDocId(item.name),
      ...item,
    }))
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
      };
    })
    .filter(
      (item): item is { name: string; province: string | null; lat: number; lon: number } =>
        Boolean(item),
    )
    .map((item) => ({
      id: buildDocId(item.name, item.province ?? ""),
      ...item,
    }))
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
        city: toSafeString(data.city),
        province: toSafeString(data.province),
        lat,
        lon,
      };
    })
    .filter(
      (
        item,
      ): item is { name: string; city: string | null; province: string | null; lat: number; lon: number } =>
        Boolean(item),
    )
    .map((item) => ({
      id: buildQuarterDocId(item.name, item.city, item.province, item.lat, item.lon),
      ...item,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));

  if (provinces.length === 0 && cities.length === 0 && quarters.length === 0) {
    return null;
  }

  return {
    country: {
      name: countryName,
      iso2: countryIso2,
    },
    sourceMode,
    sourcePath,
    sourceBucket,
    sourceObjectPath,
    sourceUpdatedAt,
    provinces,
    cities,
    quarters,
  };
}

export async function syncGabonOsmProjectionFromRoot() : Promise<GabonOsmProjectionSyncResult> {
  const selector = await getGabonOsmSelectorDataFromRoot(true);
  if (!selector) {
    throw new Error("OSM_SOURCE_UNAVAILABLE");
  }

  const [existingProvinceDocs, existingCityDocs, existingQuarterDocs] = await Promise.all([
    readProjectionCollectionDocs(COLLECTION_PROVINCES),
    readProjectionCollectionDocs(COLLECTION_CITIES),
    readProjectionCollectionDocs(COLLECTION_QUARTERS),
  ]);
  const manualProvinceIds = new Set(
    existingProvinceDocs.filter((doc) => doc.source === "manual").map((doc) => doc.id),
  );
  const manualCityIds = new Set(
    existingCityDocs.filter((doc) => doc.source === "manual").map((doc) => doc.id),
  );
  const manualQuarterIds = new Set(
    existingQuarterDocs.filter((doc) => doc.source === "manual").map((doc) => doc.id),
  );

  const provinceDocs = new Map<string, Record<string, unknown>>();
  for (const province of selector.provinces) {
    const docId = buildDocId(province.name);
    if (manualProvinceIds.has(docId)) {
      continue;
    }
    provinceDocs.set(docId, {
      source: "osm",
      name: province.name,
      normalizedName: normalizeName(province.name),
      lat: province.lat,
      lon: province.lon,
      countryName: selector.country.name,
      countryIso2: selector.country.iso2,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const cityDocs = new Map<string, Record<string, unknown>>();
  for (const city of selector.cities) {
    const docId = buildDocId(city.name, city.province ?? "");
    if (manualCityIds.has(docId)) {
      continue;
    }
    cityDocs.set(docId, {
      source: "osm",
      name: city.name,
      normalizedName: normalizeName(city.name),
      province: city.province,
      normalizedProvince: city.province ? normalizeName(city.province) : null,
      lat: city.lat,
      lon: city.lon,
      countryName: selector.country.name,
      countryIso2: selector.country.iso2,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const quarterDocs = new Map<string, Record<string, unknown>>();
  for (const quarter of selector.quarters) {
    const docId = buildQuarterDocId(
      quarter.name,
      quarter.city,
      quarter.province,
      quarter.lat,
      quarter.lon,
    );
    if (manualQuarterIds.has(docId)) {
      continue;
    }
    quarterDocs.set(docId, {
      source: "osm",
      name: quarter.name,
      normalizedName: normalizeName(quarter.name),
      city: quarter.city,
      province: quarter.province,
      normalizedCity: quarter.city ? normalizeName(quarter.city) : null,
      normalizedProvince: quarter.province ? normalizeName(quarter.province) : null,
      lat: quarter.lat,
      lon: quarter.lon,
      countryName: selector.country.name,
      countryIso2: selector.country.iso2,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const operations: WriteOperation[] = [];

  for (const [docId, data] of provinceDocs.entries()) {
    operations.push({ type: "set", collectionName: COLLECTION_PROVINCES, docId, data });
  }
  for (const [docId, data] of cityDocs.entries()) {
    operations.push({ type: "set", collectionName: COLLECTION_CITIES, docId, data });
  }
  for (const [docId, data] of quarterDocs.entries()) {
    operations.push({ type: "set", collectionName: COLLECTION_QUARTERS, docId, data });
  }

  const nextProvinceIds = new Set(provinceDocs.keys());
  const nextCityIds = new Set(cityDocs.keys());
  const nextQuarterIds = new Set(quarterDocs.keys());

  for (const doc of existingProvinceDocs) {
    if (!nextProvinceIds.has(doc.id) && doc.source !== "manual") {
      operations.push({ type: "delete", collectionName: COLLECTION_PROVINCES, docId: doc.id });
    }
  }
  for (const doc of existingCityDocs) {
    if (!nextCityIds.has(doc.id) && doc.source !== "manual") {
      operations.push({ type: "delete", collectionName: COLLECTION_CITIES, docId: doc.id });
    }
  }
  for (const doc of existingQuarterDocs) {
    if (!nextQuarterIds.has(doc.id) && doc.source !== "manual") {
      operations.push({ type: "delete", collectionName: COLLECTION_QUARTERS, docId: doc.id });
    }
  }

  operations.push({
    type: "set",
    collectionName: COLLECTION_META,
    docId: META_DOC_ID,
    data: {
      countryName: selector.country.name,
      countryIso2: selector.country.iso2,
      sourceMode: selector.sourceMode,
      sourcePath: selector.sourcePath,
      sourceBucket: selector.sourceBucket,
      sourceObjectPath: selector.sourceObjectPath,
      sourceUpdatedAt: selector.sourceUpdatedAt,
      counts: {
        provinces: selector.provinces.length,
        cities: selector.cities.length,
        quarters: selector.quarters.length,
      },
      projectionUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  });

  await commitWriteOperations(operations);

  return {
    country: selector.country,
    sourceMode: selector.sourceMode,
    sourcePath: selector.sourcePath,
    sourceBucket: selector.sourceBucket,
    sourceObjectPath: selector.sourceObjectPath,
    sourceUpdatedAt: selector.sourceUpdatedAt,
    counts: {
      provinces: selector.provinces.length,
      cities: selector.cities.length,
      quarters: selector.quarters.length,
    },
    syncedAt: new Date().toISOString(),
  };
}
