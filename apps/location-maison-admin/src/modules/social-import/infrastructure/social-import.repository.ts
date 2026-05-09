import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  SocialImportDecision,
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
};

type RawReviewDoc = {
  jobId?: unknown;
  announcerUid?: unknown;
  sourceId?: unknown;
  rawPostId?: unknown;
  sourcePostUrl?: unknown;
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
  };
}

function mapReviewDoc(docId: string, data: RawReviewDoc): SocialImportReviewCandidate {
  return {
    id: docId,
    jobId: toTrimmedString(data.jobId),
    announcerUid: toTrimmedString(data.announcerUid) ?? "",
    sourceId: toTrimmedString(data.sourceId),
    rawPostId: toTrimmedString(data.rawPostId) ?? docId,
    sourcePostUrl: toTrimmedString(data.sourcePostUrl),
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
  const orchestrator = sanitizeObject(data.orchestrator);

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

  const executionModeRaw = toTrimmedString(orchestrator?.executionMode)?.toLowerCase();
  const executionMode =
    executionModeRaw === "local" || executionModeRaw === "orchestrator"
      ? executionModeRaw
      : "auto";

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
      orchestratorUrlConfigured: Boolean(orchestrator?.orchestratorUrlConfigured ?? false),
      allowLocalProd: Boolean(orchestrator?.allowLocalProd ?? false),
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
  return listRawCollectionPage(JOBS_COLLECTION, {
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
  return listRawCollectionPage(REVIEW_COLLECTION, {
    limit: input.limit,
    cursor: input.cursor,
    map: (docId, data) => mapReviewDoc(docId, data as RawReviewDoc),
  });
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
