import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  ListingAuditLogItem,
  ListingModerationDecisionItem,
  ListingModerationDecisionType,
} from "@/modules/listing-management/domain/types";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";

const MODERATION_COLLECTION = COLLECTIONS.listing_moderation_decisions;
const AUDIT_COLLECTION = COLLECTIONS.audit_logs;

type RawModerationDecisionDoc = Record<string, unknown>;
type RawAuditLogDoc = Record<string, unknown>;

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

function toStatus(value: unknown) {
  return value === "FOR_RENT" || value === "FOR_SALE" ? value : null;
}

function toModerationStatus(value: unknown) {
  return value === "PENDING" || value === "APPROVED" || value === "REJECTED" ? value : null;
}

function toRecordOrNull(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toDecisionType(value: unknown): ListingModerationDecisionType | null {
  if (
    value === "APPROVE" ||
    value === "REJECT" ||
    value === "ARCHIVE" ||
    value === "UNARCHIVE" ||
    value === "STATUS_CHANGE" ||
    value === "BULK_ARCHIVE" ||
    value === "BULK_UNARCHIVE" ||
    value === "BULK_STATUS_CHANGE"
  ) {
    return value;
  }
  return null;
}

function mapDecision(
  docId: string,
  data: RawModerationDecisionDoc,
): ListingModerationDecisionItem | null {
  const propertyId = toTrimmedString(data.propertyId);
  const decision = toDecisionType(data.decision);
  const reason = toTrimmedString(data.reason);
  const actorId = toTrimmedString(data.actorId);
  if (!propertyId || !decision || !reason || !actorId) {
    return null;
  }

  return {
    id: docId,
    propertyId,
    decision,
    reason,
    beforeState: toTrimmedString(data.beforeState),
    afterState: toTrimmedString(data.afterState),
    beforeStatus: toStatus(data.beforeStatus),
    afterStatus: toStatus(data.afterStatus),
    beforeModerationStatus: toModerationStatus(data.beforeModerationStatus),
    afterModerationStatus: toModerationStatus(data.afterModerationStatus),
    actorId,
    actorRoles: toStringArray(data.actorRoles),
    correlationId: toTrimmedString(data.correlationId),
    createdAt: toIsoString(data.createdAt),
  };
}

function mapAuditLog(docId: string, data: RawAuditLogDoc): ListingAuditLogItem {
  return {
    id: docId,
    action: toTrimmedString(data.action) ?? "unknown",
    status: toTrimmedString(data.status),
    actorId: toTrimmedString(data.actorId),
    actorRoles: toStringArray(data.actorRoles),
    correlationId: toTrimmedString(data.correlationId),
    resource: toTrimmedString(data.resource),
    resourceId: toTrimmedString(data.resourceId),
    details: toRecordOrNull(data.details),
    diff: toRecordOrNull(data.diff),
    createdAt: toIsoString(data.createdAt),
  };
}

export async function createListingModerationDecision(input: {
  propertyId: string;
  decision: ListingModerationDecisionType;
  reason: string;
  beforeState: string | null;
  afterState: string | null;
  beforeStatus: "FOR_RENT" | "FOR_SALE" | null;
  afterStatus: "FOR_RENT" | "FOR_SALE" | null;
  beforeModerationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  afterModerationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  actorId: string;
  actorRoles: string[];
  correlationId: string;
}) {
  const db = getFirebaseAdminDb();
  await db.collection(MODERATION_COLLECTION).add({
    propertyId: input.propertyId,
    decision: input.decision,
    reason: input.reason,
    beforeState: input.beforeState,
    afterState: input.afterState,
    beforeStatus: input.beforeStatus,
    afterStatus: input.afterStatus,
    beforeModerationStatus: input.beforeModerationStatus ?? null,
    afterModerationStatus: input.afterModerationStatus ?? null,
    actorId: input.actorId,
    actorRoles: input.actorRoles,
    correlationId: input.correlationId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function listListingModerationDecisionsByPropertyId(input: {
  propertyId: string;
  limit?: number;
}) {
  const db = getFirebaseAdminDb();
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(input.limit ?? 100)));
  const snapshot = await db
    .collection(MODERATION_COLLECTION)
    .where("propertyId", "==", input.propertyId)
    .orderBy("createdAt", "desc")
    .limit(safeLimit)
    .get();

  return snapshot.docs
    .map((doc) => mapDecision(doc.id, doc.data() as RawModerationDecisionDoc))
    .filter(
      (decision): decision is ListingModerationDecisionItem => Boolean(decision),
    );
}

export async function listListingAuditLogsByPropertyId(input: {
  propertyId: string;
  limit?: number;
}) {
  const db = getFirebaseAdminDb();
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(input.limit ?? 100)));

  const snapshot = await db
    .collection(AUDIT_COLLECTION)
    .where("resource", "==", "property")
    .where("resourceId", "==", input.propertyId)
    .orderBy("createdAt", "desc")
    .limit(safeLimit)
    .get();

  return snapshot.docs.map((doc) =>
    mapAuditLog(doc.id, doc.data() as RawAuditLogDoc),
  );
}
