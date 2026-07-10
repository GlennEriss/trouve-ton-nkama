import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { ListingDedupMonitoringMetrics } from "@/modules/listing-management/domain/types";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";

const SETTINGS_COLLECTION = COLLECTIONS.listing_duplicate_settings;
const SETTINGS_DOC_ID = "default";
const METRICS_COLLECTION = COLLECTIONS.listing_similarity_metrics_daily;

export type ListingDedupAdvancedSettingsRecord = {
  semanticEnabled: boolean;
  semanticCandidateThreshold: number;
  semanticClusterThreshold: number;
  textWeight: number;
  priceWeight: number;
  locationWeight: number;
  maxListingsForSemantic: number;
  maxBlockSize: number;
  minTextTokens: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

function toNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return fallback;
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

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapSettingsRecord(data: Record<string, unknown>): ListingDedupAdvancedSettingsRecord {
  return {
    semanticEnabled: toBoolean(data.semanticEnabled, true),
    semanticCandidateThreshold: toNumber(data.semanticCandidateThreshold, 0.78),
    semanticClusterThreshold: toNumber(data.semanticClusterThreshold, 0.86),
    textWeight: toNumber(data.textWeight, 0.7),
    priceWeight: toNumber(data.priceWeight, 0.15),
    locationWeight: toNumber(data.locationWeight, 0.15),
    maxListingsForSemantic: Math.max(100, Math.trunc(toNumber(data.maxListingsForSemantic, 1200))),
    maxBlockSize: Math.max(20, Math.trunc(toNumber(data.maxBlockSize, 120))),
    minTextTokens: Math.max(2, Math.trunc(toNumber(data.minTextTokens, 3))),
    updatedAt: toIsoString(data.updatedAt),
    updatedBy: toTrimmedString(data.updatedBy),
  };
}

function formatDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function getListingDedupAdvancedSettingsRecord() {
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection(SETTINGS_COLLECTION)
    .doc(SETTINGS_DOC_ID)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return mapSettingsRecord(snapshot.data() as Record<string, unknown>);
}

export async function upsertListingDedupAdvancedSettingsRecord(input: {
  patch: Partial<Omit<ListingDedupAdvancedSettingsRecord, "updatedAt" | "updatedBy">>;
  actorUid: string;
}) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID);
  const existing = await ref.get();

  await ref.set(
    {
      ...input.patch,
      updatedBy: input.actorUid,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  return getListingDedupAdvancedSettingsRecord();
}

export async function upsertListingDedupMetricsDaily(input: {
  metrics: ListingDedupMonitoringMetrics;
  measuredBy: string;
}) {
  const db = getFirebaseAdminDb();
  const dateKey = formatDateKey(new Date(input.metrics.measuredAt));
  const ref = db.collection(METRICS_COLLECTION).doc(dateKey);
  const existing = await ref.get();

  await ref.set(
    {
      dateKey,
      ...input.metrics,
      measuredBy: input.measuredBy,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
}

