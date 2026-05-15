import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  getFirebaseAdminDb,
  getFirebaseAdminStorage,
} from "@/lib/firebase/firebase-admin";
import type {
  SocialImportDecision,
  SocialImportEnvironment,
  SocialImportJob,
  SocialImportReviewCandidate,
  SocialImportSettings,
  SocialImportSource,
} from "@/modules/social-import/domain/types";

const SOURCES_COLLECTION = "announcer_import_sources";
const JOBS_COLLECTION = "social_import_jobs";
const REVIEW_COLLECTION = "social_import_candidates";
const DECISIONS_COLLECTION = "social_import_decisions";
const SETTINGS_COLLECTION = "social_import_settings";
const SETTINGS_DOC_ID = "global";

type RawCollectionPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

type RawSourceDoc = {
  announcerUid?: unknown;
  platform?: unknown;
  sourceUrl?: unknown;
  sourceType?: unknown;
  status?: unknown;
  consent?: unknown;
  lastImportAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type RawJobDoc = {
  status?: unknown;
  mode?: unknown;
  environment?: unknown;
  announcerScope?: unknown;
  counters?: unknown;
  errorSummary?: unknown;
  triggeredBy?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  metadata?: unknown;
};

type RawReviewDoc = {
  jobId?: unknown;
  announcerUid?: unknown;
  sourceId?: unknown;
  rawPostId?: unknown;
  sourcePostUrl?: unknown;
  metadata?: unknown;
  title?: unknown;
  typeProperty?: unknown;
  price?: unknown;
  city?: unknown;
  province?: unknown;
  imageUrls?: unknown;
  payload?: unknown;
  listing?: unknown;
  status?: unknown;
  autoReason?: unknown;
  score?: unknown;
  reviewReason?: unknown;
  reviewedBy?: unknown;
  reviewedAt?: unknown;
  publishedPropertyId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type RawDecisionDoc = {
  jobId?: unknown;
  announcerUid?: unknown;
  rawPostId?: unknown;
  decision?: unknown;
  reason?: unknown;
  actorId?: unknown;
  createdAt?: unknown;
};

type RawSettingsDoc = {
  thresholds?: unknown;
  scheduler?: unknown;
  orchestrator?: unknown;
  updatedBy?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
};

function toIso(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    const seconds = (value as { seconds: number }).seconds;
    const nanoseconds =
      "nanoseconds" in value && typeof (value as { nanoseconds?: unknown }).nanoseconds === "number"
        ? (value as { nanoseconds: number }).nanoseconds
        : 0;
    return new Date(seconds * 1000 + nanoseconds / 1_000_000).toISOString();
  }

  return null;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toArrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toSafeNumber(value: unknown): number {
  return toNullableNumber(value) ?? 0;
}

function toDateOrNull(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPathSegment(value: string, fallback: string) {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || fallback;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function sanitizeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

async function listRawCollectionPage<T>(
  collectionName: string,
  input: {
    limit: number;
    cursor?: string | null;
    map: (docId: string, data: Record<string, unknown>) => T;
  },
): Promise<RawCollectionPage<T>> {
  const db = getFirebaseAdminDb();
  const safeLimit = Math.max(1, Math.min(500, input.limit || 100));

  let query = db
    .collection(collectionName)
    .orderBy(FieldPath.documentId())
    .limit(safeLimit + 1);

  const cursor = input.cursor?.trim();
  if (cursor) {
    query = query.startAfter(cursor);
  }

  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > safeLimit;
  const docs = hasMore ? snapshot.docs.slice(0, safeLimit) : snapshot.docs;
  const items = docs.map((doc) => input.map(doc.id, doc.data() as Record<string, unknown>));
  const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : cursor ?? null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

async function listRawCollectionPageByCreatedAtDesc<T>(
  collectionName: string,
  input: {
    limit: number;
    cursor?: string | null;
    map: (docId: string, data: Record<string, unknown>) => T;
  },
): Promise<RawCollectionPage<T>> {
  const db = getFirebaseAdminDb();
  const safeLimit = Math.max(1, Math.min(500, input.limit || 100));

  let query = db
    .collection(collectionName)
    .orderBy("createdAt", "desc")
    .orderBy(FieldPath.documentId(), "desc")
    .limit(safeLimit + 1);

  const cursor = input.cursor?.trim();
  if (cursor) {
    const cursorSnapshot = await db.collection(collectionName).doc(cursor).get();
    if (cursorSnapshot.exists) {
      query = query.startAfter(cursorSnapshot);
    }
  }

  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > safeLimit;
  const docs = hasMore ? snapshot.docs.slice(0, safeLimit) : snapshot.docs;
  const items = docs.map((doc) => input.map(doc.id, doc.data() as Record<string, unknown>));
  const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : cursor ?? null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

function mapSourceDoc(docId: string, data: RawSourceDoc): SocialImportSource {
  const consent = sanitizeObject(data.consent);

  return {
    id: docId,
    announcerUid: toTrimmedString(data.announcerUid) ?? "",
    platform: (toTrimmedString(data.platform)?.toLowerCase() ?? "facebook") as SocialImportSource["platform"],
    sourceUrl: toTrimmedString(data.sourceUrl) ?? "",
    sourceType: (toTrimmedString(data.sourceType)?.toLowerCase() ?? "profile") as SocialImportSource["sourceType"],
    status: (toTrimmedString(data.status)?.toLowerCase() ?? "active") as SocialImportSource["status"],
    consent: {
      grantedAt: toIso(consent?.grantedAt ?? null),
      grantedBy: toTrimmedString(consent?.grantedBy ?? null),
      proofRef: toTrimmedString(consent?.proofRef ?? null),
      expiresAt: toIso(consent?.expiresAt ?? null),
    },
    lastImportAt: toIso(data.lastImportAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapJobDoc(docId: string, data: RawJobDoc): SocialImportJob {
  const counters = sanitizeObject(data.counters);
  const metadata = sanitizeObject(data.metadata);
  return {
    id: docId,
    status: (toTrimmedString(data.status)?.toLowerCase() ?? "running") as SocialImportJob["status"],
    mode: (toTrimmedString(data.mode)?.toLowerCase() ?? "manual") as SocialImportJob["mode"],
    environment: (toTrimmedString(data.environment)?.toLowerCase() ?? "dev") as SocialImportJob["environment"],
    announcerScope: toArrayOfStrings(data.announcerScope),
    counters: {
      rawFetched: toSafeNumber(counters?.rawFetched),
      normalizedOk: toSafeNumber(counters?.normalizedOk),
      needsReview: toSafeNumber(counters?.needsReview),
      published: toSafeNumber(counters?.published),
      rejected: toSafeNumber(counters?.rejected),
    },
    errorSummary: toTrimmedString(data.errorSummary),
    triggeredBy: toTrimmedString(data.triggeredBy),
    startedAt: toIso(data.startedAt),
    endedAt: toIso(data.endedAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    metadata,
  };
}

function extractImageUrlsFromListingPayload(payload: Record<string, unknown> | null) {
  if (!payload) {
    return [];
  }
  const rawImages = payload.images;
  if (!Array.isArray(rawImages)) {
    return [];
  }

  const urls: string[] = [];
  for (const image of rawImages) {
    if (typeof image === "string") {
      const trimmed = image.trim();
      if (trimmed.length > 0) {
        urls.push(trimmed);
      }
      continue;
    }
    if (image && typeof image === "object" && !Array.isArray(image)) {
      const fileURL = toTrimmedString((image as { fileURL?: unknown }).fileURL);
      if (fileURL) {
        urls.push(fileURL);
      }
    }
  }

  return Array.from(new Set(urls));
}

function resolveListingPayload(data: RawReviewDoc) {
  const payload = sanitizeObject(data.payload);
  const payloadListing = payload ? sanitizeObject(payload.listing) : null;
  const directListing = sanitizeObject(data.listing);
  return payloadListing ?? directListing;
}

function mapReviewDoc(docId: string, data: RawReviewDoc): SocialImportReviewCandidate {
  const listing = resolveListingPayload(data);
  const metadata = sanitizeObject(data.metadata);
  const imageUrls = Array.from(
    new Set([
      ...toArrayOfStrings(data.imageUrls),
      ...extractImageUrlsFromListingPayload(listing),
    ]),
  );
  const sourcePublishedAt =
    toIso(metadata?.sourcePublishedAt) ||
    toIso(listing?.sourcePublishedAt) ||
    toIso(listing?.createdAt) ||
    null;

  return {
    id: docId,
    jobId: toTrimmedString(data.jobId),
    announcerUid: toTrimmedString(data.announcerUid) ?? "",
    sourceId: toTrimmedString(data.sourceId),
    rawPostId: toTrimmedString(data.rawPostId) ?? docId,
    sourcePostUrl: toTrimmedString(data.sourcePostUrl),
    sourcePublishedAt,
    rawJsonPath: toTrimmedString(metadata?.rawJsonPath) ?? null,
    rawJsonBucket: toTrimmedString(metadata?.rawJsonBucket) ?? null,
    rawJsonGsUri: toTrimmedString(metadata?.rawJsonGsUri) ?? null,
    rawJsonSizeBytes: toNullableNumber(metadata?.rawJsonSizeBytes),
    title: toTrimmedString(data.title) ?? toTrimmedString(listing?.title),
    typeProperty: toTrimmedString(data.typeProperty) ?? toTrimmedString(listing?.typeProperty),
    price: toNullableNumber(data.price) ?? toNullableNumber(listing?.price),
    city: toTrimmedString(data.city) ?? toTrimmedString(listing?.city),
    province: toTrimmedString(data.province) ?? toTrimmedString(listing?.province),
    imageUrls,
    status: (toTrimmedString(data.status)?.toLowerCase() ?? "needs_review") as SocialImportReviewCandidate["status"],
    autoReason: toTrimmedString(data.autoReason),
    score: toNullableNumber(data.score),
    reviewReason: toTrimmedString(data.reviewReason),
    reviewedBy: toTrimmedString(data.reviewedBy),
    reviewedAt: toIso(data.reviewedAt),
    publishedPropertyId: toTrimmedString(data.publishedPropertyId),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapDecisionDoc(docId: string, data: RawDecisionDoc): SocialImportDecision {
  return {
    id: docId,
    jobId: toTrimmedString(data.jobId),
    announcerUid: toTrimmedString(data.announcerUid),
    rawPostId: toTrimmedString(data.rawPostId),
    decision: (toTrimmedString(data.decision)?.toLowerCase() ?? "reject") as SocialImportDecision["decision"],
    reason: toTrimmedString(data.reason),
    actorId: toTrimmedString(data.actorId),
    createdAt: toIso(data.createdAt),
  };
}

function mapSettingsDoc(docId: string, data: RawSettingsDoc): SocialImportSettings {
  const thresholds = sanitizeObject(data.thresholds);
  const scheduler = sanitizeObject(data.scheduler);

  const toNumberInRange = (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
  ) => {
    const candidate = toNullableNumber(value);
    if (candidate == null) {
      return fallback;
    }
    return Math.max(min, Math.min(max, candidate));
  };

  const executionMode = "local";

  const schedulerEnvironmentRaw = toTrimmedString(scheduler?.environment)?.toLowerCase();
  const schedulerEnvironment =
    schedulerEnvironmentRaw === "preprod" || schedulerEnvironmentRaw === "prod"
      ? schedulerEnvironmentRaw
      : "dev";

  return {
    id: docId,
    thresholds: {
      autoPublishMinScore: toNumberInRange(thresholds?.autoPublishMinScore, 0.82, 0, 1),
      autoRejectMaxScore: toNumberInRange(thresholds?.autoRejectMaxScore, 0.3, 0, 1),
      defaultRunLimit: Math.floor(toNumberInRange(thresholds?.defaultRunLimit, 400, 1, 1000)),
      maxRunLimit: Math.floor(toNumberInRange(thresholds?.maxRunLimit, 1000, 1, 20000)),
    },
    scheduler: {
      enabled: Boolean(scheduler?.enabled ?? false),
      cronExpression:
        toTrimmedString(scheduler?.cronExpression) ?? "0 2 28-31 * *",
      timezone:
        toTrimmedString(scheduler?.timezone) ?? "Africa/Dakar",
      environment: schedulerEnvironment,
      includeImported: Boolean(scheduler?.includeImported ?? false),
      headless: Boolean(scheduler?.headless ?? true),
      defaultReason:
        toTrimmedString(scheduler?.defaultReason) ??
        "Import social planifie depuis le dashboard admin.",
    },
    orchestrator: {
      executionMode,
      orchestratorUrlConfigured: false,
      allowLocalProd: true,
    },
    updatedBy: toTrimmedString(data.updatedBy),
    updatedAt: toIso(data.updatedAt),
    createdAt: toIso(data.createdAt),
  };
}

export async function listSocialImportSourcesRawPage(input: {
  limit: number;
  cursor?: string | null;
}) {
  return listRawCollectionPage(SOURCES_COLLECTION, {
    limit: input.limit,
    cursor: input.cursor,
    map: (docId, data) => mapSourceDoc(docId, data as RawSourceDoc),
  });
}

export async function listSocialImportJobsRawPage(input: {
  limit: number;
  cursor?: string | null;
}) {
  return listRawCollectionPageByCreatedAtDesc(JOBS_COLLECTION, {
    limit: input.limit,
    cursor: input.cursor,
    map: (docId, data) => mapJobDoc(docId, data as RawJobDoc),
  });
}

export async function getSocialImportJobById(jobId: string) {
  const db = getFirebaseAdminDb();
  const directRef = db.collection(JOBS_COLLECTION).doc(jobId);
  const directSnapshot = await directRef.get();

  if (directSnapshot.exists) {
    return mapJobDoc(directSnapshot.id, directSnapshot.data() as RawJobDoc);
  }

  const byJobId = await db
    .collection(JOBS_COLLECTION)
    .where("jobId", "==", jobId)
    .limit(1)
    .get();

  if (byJobId.empty) {
    return null;
  }

  const doc = byJobId.docs[0];
  return mapJobDoc(doc.id, doc.data() as RawJobDoc);
}

async function resolveSocialImportJobDocRef(jobId: string) {
  const db = getFirebaseAdminDb();
  const directRef = db.collection(JOBS_COLLECTION).doc(jobId);
  const directSnapshot = await directRef.get();
  if (directSnapshot.exists) {
    return directRef;
  }

  const byJobId = await db
    .collection(JOBS_COLLECTION)
    .where("jobId", "==", jobId)
    .limit(1)
    .get();

  if (byJobId.empty) {
    return null;
  }

  return byJobId.docs[0].ref;
}

export async function patchSocialImportJobById(input: {
  jobId: string;
  patch: Partial<{
    status: SocialImportJob["status"];
    mode: SocialImportJob["mode"];
    environment: SocialImportJob["environment"];
    announcerScope: string[];
    counters: Partial<SocialImportJob["counters"]>;
    errorSummary: string | null;
    triggeredBy: string | null;
    startedAt: string | null;
    endedAt: string | null;
    metadata: Record<string, unknown> | null;
  }>;
}) {
  const ref = await resolveSocialImportJobDocRef(input.jobId);
  if (!ref) {
    return null;
  }

  const beforeSnapshot = await ref.get();
  if (!beforeSnapshot.exists) {
    return null;
  }

  const before = mapJobDoc(beforeSnapshot.id, beforeSnapshot.data() as RawJobDoc);
  const patch: Record<string, unknown> = {};

  if (input.patch.status) {
    patch.status = input.patch.status;
  }
  if (input.patch.mode) {
    patch.mode = input.patch.mode;
  }
  if (input.patch.environment) {
    patch.environment = input.patch.environment;
  }
  if (Array.isArray(input.patch.announcerScope)) {
    patch.announcerScope = input.patch.announcerScope
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (input.patch.counters) {
    const nextCounters = {
      rawFetched: toSafeNumber(
        input.patch.counters.rawFetched ?? before.counters.rawFetched,
      ),
      normalizedOk: toSafeNumber(
        input.patch.counters.normalizedOk ?? before.counters.normalizedOk,
      ),
      needsReview: toSafeNumber(
        input.patch.counters.needsReview ?? before.counters.needsReview,
      ),
      published: toSafeNumber(
        input.patch.counters.published ?? before.counters.published,
      ),
      rejected: toSafeNumber(
        input.patch.counters.rejected ?? before.counters.rejected,
      ),
    };
    patch.counters = nextCounters;
  }
  if (input.patch.errorSummary !== undefined) {
    patch.errorSummary = input.patch.errorSummary;
  }
  if (input.patch.triggeredBy !== undefined) {
    patch.triggeredBy = input.patch.triggeredBy;
  }
  if (input.patch.startedAt !== undefined) {
    patch.startedAt = toDateOrNull(input.patch.startedAt) ?? null;
  }
  if (input.patch.endedAt !== undefined) {
    patch.endedAt = toDateOrNull(input.patch.endedAt) ?? null;
  }
  if (input.patch.metadata !== undefined) {
    patch.metadata = input.patch.metadata ?? null;
  }

  await ref.set(
    {
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const after = await getSocialImportJobById(before.id);
  if (!after) {
    return null;
  }
  return { before, after };
}

export async function listSocialImportReviewRawPage(input: {
  limit: number;
  cursor?: string | null;
}) {
  return listRawCollectionPageByCreatedAtDesc(REVIEW_COLLECTION, {
    limit: input.limit,
    cursor: input.cursor,
    map: (docId, data) => mapReviewDoc(docId, data as RawReviewDoc),
  });
}

export async function upsertSocialImportReviewCandidates(input: {
  candidates: Array<{
    id: string;
    jobId: string;
    announcerUid: string;
    sourceId?: string | null;
    rawPostId: string;
    sourcePostUrl?: string | null;
    title?: string | null;
    typeProperty?: string | null;
    price?: number | null;
    city?: string | null;
    province?: string | null;
    imageUrls?: string[];
    status: SocialImportReviewCandidate["status"];
    autoReason?: string | null;
    score?: number | null;
    payload?: Record<string, unknown> | null;
    listing?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }>;
}) {
  if (!Array.isArray(input.candidates) || input.candidates.length === 0) {
    return {
      upserted: 0,
      created: 0,
      updated: 0,
      readyToPublish: 0,
      needsReview: 0,
      rejected: 0,
    };
  }

  const db = getFirebaseAdminDb();
  let created = 0;
  let updated = 0;
  let readyToPublish = 0;
  let needsReview = 0;
  let rejected = 0;

  for (const candidate of input.candidates) {
    const id = String(candidate.id || "").trim();
    if (!id) {
      continue;
    }

    const ref = db.collection(REVIEW_COLLECTION).doc(id);
    const beforeSnapshot = await ref.get();
    const before = beforeSnapshot.exists
      ? mapReviewDoc(beforeSnapshot.id, beforeSnapshot.data() as RawReviewDoc)
      : null;

    const normalizedStatus = (() => {
      if (before && (before.status === "published" || before.status === "rejected")) {
        return before.status;
      }
      if (
        candidate.status === "ready_to_publish" ||
        candidate.status === "needs_review" ||
        candidate.status === "rejected" ||
        candidate.status === "published"
      ) {
        return candidate.status;
      }
      return "needs_review";
    })();

    if (normalizedStatus === "ready_to_publish") {
      readyToPublish += 1;
    } else if (normalizedStatus === "rejected") {
      rejected += 1;
    } else {
      needsReview += 1;
    }

    const patch: Record<string, unknown> = {
      jobId: candidate.jobId,
      announcerUid: candidate.announcerUid,
      sourceId: candidate.sourceId ?? null,
      rawPostId: candidate.rawPostId,
      sourcePostUrl: candidate.sourcePostUrl ?? null,
      title: candidate.title ?? null,
      typeProperty: candidate.typeProperty ?? null,
      price: candidate.price ?? null,
      city: candidate.city ?? null,
      province: candidate.province ?? null,
      imageUrls: Array.from(
        new Set((candidate.imageUrls ?? []).map((value) => String(value || "").trim()).filter(Boolean)),
      ),
      status: normalizedStatus,
      autoReason: candidate.autoReason ?? null,
      score: candidate.score ?? null,
      payload: candidate.payload ?? null,
      listing: candidate.listing ?? null,
      metadata: candidate.metadata ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (beforeSnapshot.exists) {
      updated += 1;
    } else {
      patch.createdAt = FieldValue.serverTimestamp();
      created += 1;
    }

    await ref.set(patch, { merge: true });
  }

  return {
    upserted: created + updated,
    created,
    updated,
    readyToPublish,
    needsReview,
    rejected,
  };
}

export async function writeSocialImportRawPostsToStorage(input: {
  environment: SocialImportEnvironment;
  jobId: string;
  announcerUid: string;
  records: Array<{
    rawPostId: string;
    post: Record<string, unknown>;
  }>;
}) {
  if (!Array.isArray(input.records) || input.records.length === 0) {
    return [] as Array<{
      rawPostId: string;
      rawJsonPath: string;
      rawJsonBucket: string;
      rawJsonGsUri: string;
      rawJsonSizeBytes: number;
    }>;
  }

  const storage = getFirebaseAdminStorage();
  const bucket = storage.bucket();
  const bucketName = bucket.name?.trim();
  if (!bucketName) {
    throw new Error("SOCIAL_IMPORT_STORAGE_BUCKET_NOT_CONFIGURED");
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = pad2(now.getUTCMonth() + 1);
  const dd = pad2(now.getUTCDate());
  const prefix = (process.env.SOCIAL_IMPORT_RAW_STORAGE_PREFIX || "social-import/raw").replace(
    /^\/+|\/+$/g,
    "",
  );
  const safeEnv = toPathSegment(input.environment, "dev");
  const safeJobId = toPathSegment(input.jobId, "unknown_job");
  const safeAnnouncerUid = toPathSegment(input.announcerUid, "unknown_announcer");

  const persisted: Array<{
    rawPostId: string;
    rawJsonPath: string;
    rawJsonBucket: string;
    rawJsonGsUri: string;
    rawJsonSizeBytes: number;
  }> = [];

  for (const record of input.records) {
    const rawPostId = String(record.rawPostId || "").trim();
    if (!rawPostId) {
      continue;
    }

    const safeRawPostId = toPathSegment(rawPostId, "unknown_post");
    const objectPath = `${prefix}/${safeEnv}/${safeAnnouncerUid}/${yyyy}/${mm}/${dd}/${safeJobId}/${safeRawPostId}.json`;
    const payload = {
      schemaVersion: 1,
      source: "json_manual_import",
      storedAt: new Date().toISOString(),
      environment: input.environment,
      jobId: input.jobId,
      announcerUid: input.announcerUid,
      rawPostId,
      post: record.post,
    };
    const serialized = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(serialized, "utf8");

    await bucket.file(objectPath).save(serialized, {
      resumable: false,
      contentType: "application/json; charset=utf-8",
      metadata: {
        cacheControl: "private, max-age=0, no-transform",
      },
      validation: "crc32c",
    });

    persisted.push({
      rawPostId,
      rawJsonPath: objectPath,
      rawJsonBucket: bucketName,
      rawJsonGsUri: `gs://${bucketName}/${objectPath}`,
      rawJsonSizeBytes: sizeBytes,
    });
  }

  return persisted;
}

export async function listSocialImportDecisionsRawPage(input: {
  limit: number;
  cursor?: string | null;
}) {
  return listRawCollectionPage(DECISIONS_COLLECTION, {
    limit: input.limit,
    cursor: input.cursor,
    map: (docId, data) => mapDecisionDoc(docId, data as RawDecisionDoc),
  });
}

export async function getSocialImportSourceById(sourceId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(SOURCES_COLLECTION).doc(sourceId).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapSourceDoc(snapshot.id, snapshot.data() as RawSourceDoc);
}

export async function createSocialImportSourceRecord(input: {
  announcerUid: string;
  platform: SocialImportSource["platform"];
  sourceUrl: string;
  sourceType: SocialImportSource["sourceType"];
  status: SocialImportSource["status"];
  consent?: Partial<SocialImportSource["consent"]> | null;
  createdBy: string;
}) {
  const db = getFirebaseAdminDb();
  const now = FieldValue.serverTimestamp();
  const ref = db.collection(SOURCES_COLLECTION).doc();

  const grantedAt = toDateOrNull(input.consent?.grantedAt ?? null);
  const expiresAt = toDateOrNull(input.consent?.expiresAt ?? null);

  await ref.set(
    {
      announcerUid: input.announcerUid,
      platform: input.platform,
      sourceUrl: input.sourceUrl,
      sourceType: input.sourceType,
      status: input.status,
      consent: {
        grantedAt: grantedAt ?? null,
        grantedBy: input.consent?.grantedBy ?? null,
        proofRef: input.consent?.proofRef ?? null,
        expiresAt: expiresAt ?? null,
      },
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  const created = await getSocialImportSourceById(ref.id);
  if (!created) {
    throw new Error("SOCIAL_IMPORT_SOURCE_CREATE_FAILED");
  }
  return created;
}

export async function patchSocialImportSourceById(input: {
  sourceId: string;
  patch: {
    platform?: SocialImportSource["platform"];
    sourceUrl?: string;
    sourceType?: SocialImportSource["sourceType"];
    status?: SocialImportSource["status"];
    lastImportAt?: string | null;
  };
  updatedBy: string;
}) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(SOURCES_COLLECTION).doc(input.sourceId);
  const beforeSnapshot = await ref.get();
  if (!beforeSnapshot.exists) {
    return null;
  }
  const before = mapSourceDoc(beforeSnapshot.id, beforeSnapshot.data() as RawSourceDoc);

  const patch: Record<string, unknown> = {};
  if (input.patch.platform) {
    patch.platform = input.patch.platform;
  }
  if (typeof input.patch.sourceUrl === "string") {
    patch.sourceUrl = input.patch.sourceUrl;
  }
  if (input.patch.sourceType) {
    patch.sourceType = input.patch.sourceType;
  }
  if (input.patch.status) {
    patch.status = input.patch.status;
  }
  if (input.patch.lastImportAt !== undefined) {
    patch.lastImportAt = toDateOrNull(input.patch.lastImportAt) ?? null;
  }

  await ref.set(
    {
      ...patch,
      updatedBy: input.updatedBy,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const after = await getSocialImportSourceById(input.sourceId);
  if (!after) {
    throw new Error("SOCIAL_IMPORT_SOURCE_PATCH_FAILED");
  }
  return { before, after };
}

export async function patchSocialImportSourceConsent(input: {
  sourceId: string;
  consent: Partial<SocialImportSource["consent"]>;
  updatedBy: string;
}) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(SOURCES_COLLECTION).doc(input.sourceId);
  const beforeSnapshot = await ref.get();
  if (!beforeSnapshot.exists) {
    return null;
  }
  const before = mapSourceDoc(beforeSnapshot.id, beforeSnapshot.data() as RawSourceDoc);

  const existingConsent = before.consent;
  const nextGrantedAt = input.consent.grantedAt === undefined
    ? existingConsent.grantedAt
    : input.consent.grantedAt;
  const nextExpiresAt = input.consent.expiresAt === undefined
    ? existingConsent.expiresAt
    : input.consent.expiresAt;
  const nextGrantedBy = input.consent.grantedBy === undefined
    ? existingConsent.grantedBy
    : input.consent.grantedBy;
  const nextProofRef = input.consent.proofRef === undefined
    ? existingConsent.proofRef
    : input.consent.proofRef;

  await ref.set(
    {
      consent: {
        grantedAt: toDateOrNull(nextGrantedAt) ?? null,
        grantedBy: nextGrantedBy ?? null,
        proofRef: nextProofRef ?? null,
        expiresAt: toDateOrNull(nextExpiresAt) ?? null,
      },
      updatedBy: input.updatedBy,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const after = await getSocialImportSourceById(input.sourceId);
  if (!after) {
    throw new Error("SOCIAL_IMPORT_SOURCE_CONSENT_PATCH_FAILED");
  }
  return { before, after };
}

export async function createSocialImportJobRecord(input: {
  status: SocialImportJob["status"];
  mode: SocialImportJob["mode"];
  environment: SocialImportJob["environment"];
  announcerScope: string[];
  counters?: Partial<SocialImportJob["counters"]>;
  errorSummary?: string | null;
  triggeredBy?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(JOBS_COLLECTION).doc();

  await ref.set(
    {
      jobId: ref.id,
      status: input.status,
      mode: input.mode,
      environment: input.environment,
      announcerScope: input.announcerScope,
      counters: {
        rawFetched: toSafeNumber(input.counters?.rawFetched),
        normalizedOk: toSafeNumber(input.counters?.normalizedOk),
        needsReview: toSafeNumber(input.counters?.needsReview),
        published: toSafeNumber(input.counters?.published),
        rejected: toSafeNumber(input.counters?.rejected),
      },
      errorSummary: input.errorSummary ?? null,
      triggeredBy: input.triggeredBy ?? null,
      startedAt: toDateOrNull(input.startedAt) ?? null,
      endedAt: toDateOrNull(input.endedAt) ?? null,
      metadata: input.metadata ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const created = await getSocialImportJobById(ref.id);
  if (!created) {
    throw new Error("SOCIAL_IMPORT_JOB_CREATE_FAILED");
  }
  return created;
}

export async function getSocialImportReviewCandidateById(candidateId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(REVIEW_COLLECTION).doc(candidateId).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapReviewDoc(snapshot.id, snapshot.data() as RawReviewDoc);
}

export async function getSocialImportReviewCandidateRawById(candidateId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(REVIEW_COLLECTION).doc(candidateId).get();
  if (!snapshot.exists) {
    return null;
  }

  const rawData = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    candidate: mapReviewDoc(snapshot.id, rawData as RawReviewDoc),
    rawData,
  };
}

export async function patchSocialImportReviewCandidateById(input: {
  candidateId: string;
  patch: Partial<{
    status: SocialImportReviewCandidate["status"];
    autoReason: string | null;
    score: number | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    reviewReason: string | null;
    publishedPropertyId: string | null;
    publicationMetadata: Record<string, unknown> | null;
  }>;
}) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(REVIEW_COLLECTION).doc(input.candidateId);
  const beforeSnapshot = await ref.get();
  if (!beforeSnapshot.exists) {
    return null;
  }

  const before = mapReviewDoc(beforeSnapshot.id, beforeSnapshot.data() as RawReviewDoc);
  const patch: Record<string, unknown> = {};
  if (input.patch.status) {
    patch.status = input.patch.status;
  }
  if (input.patch.autoReason !== undefined) {
    patch.autoReason = input.patch.autoReason;
  }
  if (input.patch.score !== undefined) {
    patch.score = input.patch.score;
  }
  if (input.patch.reviewedBy !== undefined) {
    patch.reviewedBy = input.patch.reviewedBy;
  }
  if (input.patch.reviewReason !== undefined) {
    patch.reviewReason = input.patch.reviewReason;
  }
  if (input.patch.publishedPropertyId !== undefined) {
    patch.publishedPropertyId = input.patch.publishedPropertyId;
  }
  if (input.patch.publicationMetadata !== undefined) {
    patch.publicationMetadata = input.patch.publicationMetadata;
  }
  if (input.patch.reviewedAt !== undefined) {
    patch.reviewedAt = toDateOrNull(input.patch.reviewedAt) ?? null;
  }

  await ref.set(
    {
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const after = await getSocialImportReviewCandidateById(input.candidateId);
  if (!after) {
    throw new Error("SOCIAL_IMPORT_CANDIDATE_PATCH_FAILED");
  }

  return { before, after };
}

export async function deleteSocialImportReviewCandidateById(input: {
  candidateId: string;
}) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(REVIEW_COLLECTION).doc(input.candidateId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return null;
  }

  const before = mapReviewDoc(snapshot.id, snapshot.data() as RawReviewDoc);
  await ref.delete();
  return before;
}

export async function deleteSocialImportRawJsonObject(input: {
  objectPath: string;
  bucketName?: string | null;
}) {
  const objectPath = input.objectPath.trim();
  if (!objectPath) {
    return false;
  }

  const storage = getFirebaseAdminStorage();
  const bucket = input.bucketName?.trim()
    ? storage.bucket(input.bucketName.trim())
    : storage.bucket();
  const file = bucket.file(objectPath);
  const [exists] = await file.exists();
  if (!exists) {
    return false;
  }
  await file.delete();
  return true;
}

export async function createSocialImportDecisionRecord(input: {
  jobId?: string | null;
  announcerUid?: string | null;
  rawPostId?: string | null;
  decision: SocialImportDecision["decision"];
  reason?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const db = getFirebaseAdminDb();
  await db.collection(DECISIONS_COLLECTION).add({
    jobId: input.jobId ?? null,
    announcerUid: input.announcerUid ?? null,
    rawPostId: input.rawPostId ?? null,
    decision: input.decision,
    reason: input.reason ?? null,
    actorId: input.actorId ?? null,
    metadata: input.metadata ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getSocialImportSettings() {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapSettingsDoc(snapshot.id, snapshot.data() as RawSettingsDoc);
}

export async function upsertSocialImportSettings(input: {
  patch: Partial<{
    thresholds: Partial<SocialImportSettings["thresholds"]>;
    scheduler: Partial<SocialImportSettings["scheduler"]>;
    orchestrator: Partial<SocialImportSettings["orchestrator"]>;
  }>;
  updatedBy: string;
}) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID);
  const now = FieldValue.serverTimestamp();

  const updatePayload: Record<string, unknown> = {
    updatedBy: input.updatedBy,
    updatedAt: now,
    createdAt: now,
  };

  if (input.patch.thresholds) {
    updatePayload.thresholds = input.patch.thresholds;
  }
  if (input.patch.scheduler) {
    updatePayload.scheduler = input.patch.scheduler;
  }
  if (input.patch.orchestrator) {
    updatePayload.orchestrator = input.patch.orchestrator;
  }

  await ref.set(updatePayload, { merge: true });
  const settings = await getSocialImportSettings();
  if (!settings) {
    throw new Error("SOCIAL_IMPORT_SETTINGS_UPSERT_FAILED");
  }
  return settings;
}
