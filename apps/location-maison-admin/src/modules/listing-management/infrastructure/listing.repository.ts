import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { ListingDetails, ListingListItem } from "@/modules/listing-management/domain/types";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";
import { toIsoDate as toIsoString } from "@trouve-ton-nkama/core/utils";
import { resolveCursorSnapshot } from "@/lib/firestore/pagination";

const PROPERTIES_COLLECTION = COLLECTIONS.properties;

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

function toModerationStatus(value: unknown) {
  return value === "PENDING" || value === "APPROVED" || value === "REJECTED" ? value : null;
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
    "moderationStatus",
    "rejectionReason",
    "moderationReviewedAt",
    "moderationReviewedBy",
    "price",
    "area",
    "street",
    "city",
    "province",
    "provinceLon",
    "provinceLat",
    "cityLon",
    "cityLat",
    "streetLon",
    "streetLat",
    "country",
    "countryCode",
    "contact",
    "additionnalInformation",
    "tags",
    "createdBy",
    "images",
    "createdAt",
    "updatedAt",
    "longitude",
    "latitude",
    "isLocExact",
    "nbrRooms",
    "nbrKitchens",
    "nbrBathrooms",
    "nbrToilets",
    "nbrGarages",
    "nbrFloors",
    "nbrLivingRoom",
    "nbrFloorStudio",
    "numeroStudio",
    "nbrFloorApartment",
    "numeroApartment",
    "nbrPiscine",
    "nbrApartments",
    "hasParking",
    "nbrToilet",
    "kioskType",
    "roomType",
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
    moderationStatus: toModerationStatus(data.moderationStatus),
    rejectionReason: toTrimmedString(data.rejectionReason),
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
    additionnalInformation: toTrimmedString(data.additionnalInformation),
    longitude: toNullableNumber(data.longitude),
    latitude: toNullableNumber(data.latitude),
    provinceLon: toNullableNumber(data.provinceLon),
    provinceLat: toNullableNumber(data.provinceLat),
    cityLon: toNullableNumber(data.cityLon),
    cityLat: toNullableNumber(data.cityLat),
    streetLon: toNullableNumber(data.streetLon),
    streetLat: toNullableNumber(data.streetLat),
    isLocExact: toNullableBoolean(data.isLocExact),
    nbrRooms: toNullableNumber(data.nbrRooms),
    nbrKitchens: toNullableNumber(data.nbrKitchens),
    nbrBathrooms: toNullableNumber(data.nbrBathrooms),
    nbrToilets: toNullableNumber(data.nbrToilets),
    nbrGarages: toNullableNumber(data.nbrGarages),
    nbrFloors: toNullableNumber(data.nbrFloors),
    nbrLivingRoom: toNullableNumber(data.nbrLivingRoom),
    nbrFloorStudio: toNullableNumber(data.nbrFloorStudio),
    numeroStudio: toTrimmedString(data.numeroStudio),
    nbrFloorApartment: toNullableNumber(data.nbrFloorApartment),
    numeroApartment: toTrimmedString(data.numeroApartment),
    nbrPiscine: toNullableNumber(data.nbrPiscine),
    nbrApartments: toNullableNumber(data.nbrApartments),
    hasParking: toNullableBoolean(data.hasParking),
    nbrToilet: toNullableNumber(data.nbrToilet),
    kioskType: toTrimmedString(data.kioskType),
    roomType: toTrimmedString(data.roomType),
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
    moderationStatus: details.moderationStatus,
    rejectionReason: details.rejectionReason,
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
  const cursorDoc = await resolveCursorSnapshot(db.collection(PROPERTIES_COLLECTION), cursor);
  if (cursorDoc) {
    query = query.startAfter(cursorDoc);
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

// Distinct de patchPropertyState : moderationStatus est un champ sémantiquement
// différent (review avant publication, pas actif/archivé).
export async function patchPropertyModerationStatus(
  propertyId: string,
  input: {
    moderationStatus: "APPROVED" | "REJECTED";
    rejectionReason?: string | null;
    reviewedBy: string;
  },
) {
  await patchPropertyById(propertyId, {
    moderationStatus: input.moderationStatus,
    rejectionReason: input.moderationStatus === "REJECTED" ? input.rejectionReason ?? null : null,
    moderationReviewedAt: FieldValue.serverTimestamp(),
    moderationReviewedBy: input.reviewedBy,
  });
}

export async function listPendingListings(input: {
  limit: number;
  cursor?: string | null;
}): Promise<RawPropertyPageResult> {
  const db = getFirebaseAdminDb();
  let query = db
    .collection(PROPERTIES_COLLECTION)
    .where("moderationStatus", "==", "PENDING")
    .orderBy("createdAt", "asc")
    .limit(input.limit);

  const cursor = input.cursor?.trim() || null;
  const cursorDoc = await resolveCursorSnapshot(db.collection(PROPERTIES_COLLECTION), cursor);
  if (cursorDoc) {
    query = query.startAfter(cursorDoc);
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

export async function deletePropertyById(propertyId: string) {
  const db = getFirebaseAdminDb();
  await db.collection(PROPERTIES_COLLECTION).doc(propertyId).delete();
}
