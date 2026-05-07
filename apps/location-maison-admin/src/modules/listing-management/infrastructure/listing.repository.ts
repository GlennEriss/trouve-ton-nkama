import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { ListingDetails, ListingListItem } from "@/modules/listing-management/domain/types";

const PROPERTIES_COLLECTION = "properties";

type RawPropertyDoc = Record<string, unknown>;

type RawPropertyPageResult = {
  rows: Array<{
    docId: string;
    listing: ListingListItem;
    details: ListingDetails;
  }>;
  hasMore: boolean;
};

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableNumber(value: unknown) {
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

function toNullableBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  return null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toIsoString(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function normalizeImages(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ fileURL: string; filePATH: string }>;
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const fileURL = toTrimmedString((entry as Record<string, unknown>).fileURL);
      const filePATH = toTrimmedString((entry as Record<string, unknown>).filePATH) ?? "";

      if (!fileURL) {
        return null;
      }

      return { fileURL, filePATH };
    })
    .filter((entry): entry is { fileURL: string; filePATH: string } => Boolean(entry));
}

function mapListingDetails(docId: string, data: RawPropertyDoc): ListingDetails {
  const title = toTrimmedString(data.title) ?? docId;
  const description = toTrimmedString(data.description) ?? "";
  const typeProperty = toTrimmedString(data.typeProperty);
  const statusRaw = toTrimmedString(data.status);
  const stateRaw = toTrimmedString(data.state);
  const status = statusRaw === "FOR_RENT" || statusRaw === "FOR_SALE" ? statusRaw : null;
  const images = normalizeImages(data.images);

  const knownExtraKeys = new Set([
    "title",
    "description",
    "typeProperty",
    "status",
    "state",
    "price",
    "area",
    "street",
    "city",
    "province",
    "country",
    "countryCode",
    "contact",
    "tags",
    "createdBy",
    "images",
    "createdAt",
    "updatedAt",
    "longitude",
    "latitude",
    "isLocExact",
  ]);

  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!knownExtraKeys.has(key)) {
      extra[key] = value;
    }
  }

  return {
    id: docId,
    title,
    description,
    typeProperty,
    status,
    state: stateRaw,
    price: toNullableNumber(data.price),
    area: toNullableNumber(data.area),
    city: toTrimmedString(data.city),
    province: toTrimmedString(data.province),
    country: toTrimmedString(data.country),
    createdBy: toTrimmedString(data.createdBy),
    contact: toTrimmedString(data.contact),
    tags: toStringArray(data.tags),
    primaryImageUrl: images[0]?.fileURL ?? null,
    imageCount: images.length,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    street: toTrimmedString(data.street),
    countryCode: toTrimmedString(data.countryCode),
    longitude: toNullableNumber(data.longitude),
    latitude: toNullableNumber(data.latitude),
    isLocExact: toNullableBoolean(data.isLocExact),
    images,
    extra,
  };
}

function toListItem(details: ListingDetails): ListingListItem {
  return {
    id: details.id,
    title: details.title,
    description: details.description,
    typeProperty: details.typeProperty,
    status: details.status,
    state: details.state,
    price: details.price,
    area: details.area,
    city: details.city,
    province: details.province,
    country: details.country,
    createdBy: details.createdBy,
    contact: details.contact,
    tags: details.tags,
    primaryImageUrl: details.primaryImageUrl,
    imageCount: details.imageCount,
    createdAt: details.createdAt,
    updatedAt: details.updatedAt,
  };
}

export async function listPropertiesRawPage(input: {
  limit: number;
  cursor?: string | null;
}): Promise<RawPropertyPageResult> {
  const db = getFirebaseAdminDb();
  let query = db.collection(PROPERTIES_COLLECTION).orderBy("createdAt", "desc").limit(input.limit);

  const cursor = input.cursor?.trim() || null;
  if (cursor) {
    const cursorDoc = await db.collection(PROPERTIES_COLLECTION).doc(cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  const rows = snapshot.docs.map((doc) => {
    const details = mapListingDetails(doc.id, doc.data() as RawPropertyDoc);
    return {
      docId: doc.id,
      listing: toListItem(details),
      details,
    };
  });

  return {
    rows,
    hasMore: snapshot.docs.length === input.limit,
  };
}

export async function getPropertyById(propertyId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(PROPERTIES_COLLECTION).doc(propertyId).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapListingDetails(snapshot.id, snapshot.data() as RawPropertyDoc);
}

export async function patchPropertyById(
  propertyId: string,
  patch: Record<string, unknown>,
) {
  const db = getFirebaseAdminDb();
  await db
    .collection(PROPERTIES_COLLECTION)
    .doc(propertyId)
    .set(
      {
        ...patch,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function patchPropertyState(
  propertyId: string,
  state: "IN_PROGRESS" | "ARCHIVED",
) {
  await patchPropertyById(propertyId, { state });
}

export async function deletePropertyById(propertyId: string) {
  const db = getFirebaseAdminDb();
  await db.collection(PROPERTIES_COLLECTION).doc(propertyId).delete();
}
