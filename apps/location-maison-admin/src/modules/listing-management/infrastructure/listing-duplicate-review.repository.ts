import { FieldPath, FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  ListingDuplicateReason,
  ListingDuplicateResolution,
  ListingDuplicateResolutionAction,
} from "@/modules/listing-management/domain/types";

const COLLECTION = "listing_duplicate_reviews";
const MAX_IN_QUERY = 10;

type RawDuplicateReviewDoc = Record<string, unknown>;

export type ListingDuplicateReviewRecord = {
  clusterId: string;
  fingerprint: string | null;
  reason: ListingDuplicateReason | null;
  listingIds: string[];
  resolution: ListingDuplicateResolution;
};

type UpsertDuplicateReviewInput = {
  clusterId: string;
  fingerprint: string;
  reason: ListingDuplicateReason;
  listingIds: string[];
  action: ListingDuplicateResolutionAction;
  note: string | null;
  targetListingId: string | null;
  actorUid: string;
  actorRoles: string[];
};

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => toTrimmedString(item))
    .filter((item): item is string => Boolean(item));
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

function toDuplicateReason(value: unknown): ListingDuplicateReason | null {
  if (
    value === "same_signature" ||
    value === "same_primary_image" ||
    value === "semantic_similarity"
  ) {
    return value;
  }
  return null;
}

function toDuplicateResolutionAction(value: unknown): ListingDuplicateResolutionAction | null {
  if (
    value === "not_duplicate" ||
    value === "confirm_duplicate" ||
    value === "archive_target" ||
    value === "keep_one_archive_others" ||
    value === "needs_review"
  ) {
    return value;
  }
  return null;
}

function mapDuplicateReviewRecord(
  docId: string,
  data: RawDuplicateReviewDoc,
): ListingDuplicateReviewRecord | null {
  const action = toDuplicateResolutionAction(data.action);
  const actorUid = toTrimmedString(data.actorUid);
  if (!action || !actorUid) {
    return null;
  }

  const reviewedAt =
    toIsoString(data.reviewedAt) ??
    toIsoString(data.updatedAt) ??
    toIsoString(data.createdAt);

  return {
    clusterId: docId,
    fingerprint: toTrimmedString(data.fingerprint),
    reason: toDuplicateReason(data.reason),
    listingIds: toStringArray(data.listingIds),
    resolution: {
      action,
      note: toTrimmedString(data.note),
      targetListingId: toTrimmedString(data.targetListingId),
      actorUid,
      actorRoles: toStringArray(data.actorRoles),
      reviewedAt,
    },
  };
}

function chunk<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function getDuplicateReviewRecordByClusterId(clusterId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).doc(clusterId).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapDuplicateReviewRecord(
    snapshot.id,
    snapshot.data() as RawDuplicateReviewDoc,
  );
}

export async function listDuplicateReviewRecordsByClusterIds(clusterIds: string[]) {
  const db = getFirebaseAdminDb();
  const uniqueClusterIds = Array.from(
    new Set(clusterIds.map((value) => value.trim()).filter((value) => value.length > 0)),
  );

  if (!uniqueClusterIds.length) {
    return new Map<string, ListingDuplicateReviewRecord>();
  }

  const recordMap = new Map<string, ListingDuplicateReviewRecord>();
  const batches = chunk(uniqueClusterIds, MAX_IN_QUERY);

  for (const batch of batches) {
    const snapshot = await db
      .collection(COLLECTION)
      .where(FieldPath.documentId(), "in", batch)
      .get();

    for (const doc of snapshot.docs) {
      const record = mapDuplicateReviewRecord(
        doc.id,
        doc.data() as RawDuplicateReviewDoc,
      );
      if (!record) {
        continue;
      }
      recordMap.set(record.clusterId, record);
    }
  }

  return recordMap;
}

export async function upsertDuplicateReviewRecord(input: UpsertDuplicateReviewInput) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(input.clusterId);
  const existing = await ref.get();

  await ref.set(
    {
      clusterId: input.clusterId,
      fingerprint: input.fingerprint,
      reason: input.reason,
      listingIds: input.listingIds,
      action: input.action,
      note: input.note,
      targetListingId: input.targetListingId,
      actorUid: input.actorUid,
      actorRoles: input.actorRoles,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  return getDuplicateReviewRecordByClusterId(input.clusterId);
}

export async function listDuplicateReviewRecords(limit = 5000) {
  const db = getFirebaseAdminDb();
  const safeLimit = Math.max(1, Math.min(20000, Math.trunc(limit)));
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(safeLimit)
    .get();

  return snapshot.docs
    .map((doc) =>
      mapDuplicateReviewRecord(doc.id, doc.data() as RawDuplicateReviewDoc),
    )
    .filter((record): record is ListingDuplicateReviewRecord => Boolean(record));
}
