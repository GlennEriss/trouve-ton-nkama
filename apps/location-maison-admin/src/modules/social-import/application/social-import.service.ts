import { createHash } from "node:crypto";

import { createListingForAnnouncer } from "@/modules/account-provisioning/application/account-provisioning.service";
import type { CreateListingForAnnouncerInput } from "@/modules/account-provisioning/domain/types";
import { listingFullSchema, normalizeImages } from "@/modules/listing-management/presentation/listing-validation";
import type {
  ListSocialImportDecisionsInput,
  ListSocialImportDecisionsResult,
  SocialImportEnvironment,
  SocialImportJob,
  ListSocialImportJobsInput,
  ListSocialImportJobsResult,
  ListSocialImportReviewInput,
  ListSocialImportReviewResult,
  ListSocialImportSourcesInput,
  ListSocialImportSourcesResult,
  SocialImportDecisionFilter,
  SocialImportJobStatusFilter,
  SocialImportPlatform,
  SocialImportReviewStatusFilter,
  SocialImportSettings,
  SocialImportSource,
  SocialImportSchedulerEnvironment,
  SocialImportSourceStatus,
  SocialImportSourceStatusFilter,
} from "@/modules/social-import/domain/types";
import {
  createSocialImportDecisionRecord,
  createSocialImportJobRecord,
  createSocialImportSourceRecord,
  getSocialImportJobById,
  getSocialImportReviewCandidateById,
  getSocialImportReviewCandidateRawById,
  getSocialImportSettings as getSocialImportSettingsRecord,
  getSocialImportSourceById,
  listSocialImportDecisionsRawPage,
  listSocialImportJobsRawPage,
  listSocialImportReviewRawPage,
  listSocialImportSourcesRawPage,
  patchSocialImportJobById,
  patchSocialImportReviewCandidateById,
  patchSocialImportSourceById,
  patchSocialImportSourceConsent,
  writeSocialImportRawPostsToStorage,
  upsertSocialImportReviewCandidates,
  upsertSocialImportSettings,
} from "@/modules/social-import/infrastructure/social-import.repository";
import { dispatchSocialImportRun } from "@/modules/social-import/infrastructure/social-import-orchestrator";
import {
  claimSocialImportIdempotency,
  completeSocialImportIdempotency,
  failSocialImportIdempotency,
} from "@/modules/social-import/infrastructure/social-import-idempotency.repository";

const MAX_SCAN_PAGES = 80;
const MIN_SCAN_LIMIT = 40;
const MAX_SCAN_DOCS = Number(process.env.ADMIN_SCAN_DOCS_LIMIT ?? 12000);
const SOCIAL_IMPORT_STALE_RUNNING_TIMEOUT_MS = Number(
  process.env.SOCIAL_IMPORT_STALE_RUNNING_TIMEOUT_MS ?? 1000 * 60 * 90,
);
function normalizeQuery(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeUid(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizePlatform(value?: string): SocialImportPlatform | "all" {
  if (
    value === "facebook" ||
    value === "instagram" ||
    value === "tiktok" ||
    value === "linkedin" ||
    value === "x"
  ) {
    return value;
  }
  return "all";
}

function normalizeSourceStatus(value?: string): SocialImportSourceStatusFilter {
  if (value === "active" || value === "paused" || value === "revoked") {
    return value;
  }
  return "all";
}

function normalizeJobStatus(value?: string): SocialImportJobStatusFilter {
  if (
    value === "running" ||
    value === "completed" ||
    value === "failed" ||
    value === "partial" ||
    value === "needs_review"
  ) {
    return value;
  }
  return "all";
}

function normalizeReviewStatus(value?: string): SocialImportReviewStatusFilter {
  if (
    value === "ready_to_publish" ||
    value === "needs_review" ||
    value === "rejected" ||
    value === "published"
  ) {
    return value;
  }
  return "all";
}

function normalizeDecisionFilter(value?: string): SocialImportDecisionFilter {
  if (
    value === "publish" ||
    value === "reject" ||
    value === "archive_duplicate" ||
    value === "retry"
  ) {
    return value;
  }
  return "all";
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeDateInput(value?: string) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const timestamp = toTimestamp(trimmed);
  if (timestamp == null) {
    return null;
  }
  return new Date(timestamp).toISOString();
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

function toIsoFromCreationTime(value: unknown) {
  const numeric = toNullableNumber(value);
  if (numeric == null) {
    return null;
  }

  const asMs = numeric > 10_000_000_000 ? numeric : numeric * 1000;
  const date = new Date(asMs);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function extractTitleFromCaption(caption: string | null) {
  if (!caption) {
    return null;
  }
  const firstLine = caption
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return null;
  }
  return firstLine.slice(0, 180);
}

function inferTypePropertyFromCaption(caption: string | null) {
  if (!caption) {
    return null;
  }
  const text = caption.toLowerCase();
  if (text.includes("terrain")) return "TERRAIN";
  if (text.includes("studio")) return "STUDIO";
  if (text.includes("appartement")) return "APPARTEMENT";
  if (text.includes("villa")) return "VILLA";
  if (text.includes("duplex")) return "DUPLEX";
  if (text.includes("local")) return "LOCAL";
  if (text.includes("bureau")) return "BUREAU";
  return null;
}

function extractPriceFromCaption(caption: string | null) {
  if (!caption) {
    return null;
  }

  const matches = Array.from(caption.matchAll(/(\d[\d\s.,]{2,})\s*(fcfa|cfa)/gi));
  if (matches.length === 0) {
    return null;
  }

  const candidateValues = matches
    .map((match) => match[1]?.replace(/[^\d]/g, "") ?? "")
    .map((digits) => Number(digits))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (candidateValues.length === 0) {
    return null;
  }

  return Math.max(...candidateValues);
}

function inferCityFromCaption(caption: string | null) {
  if (!caption) {
    return null;
  }
  const text = caption.toLowerCase();
  if (text.includes("akanda")) return "Akanda";
  if (text.includes("libreville")) return "Libreville";
  if (text.includes("owendo")) return "Owendo";
  if (text.includes("port-gentil")) return "Port-Gentil";
  if (text.includes("franceville")) return "Franceville";
  return null;
}

function inferProvinceFromCity(city: string | null) {
  if (!city) {
    return null;
  }
  const normalized = city.trim().toLowerCase();
  if (normalized === "akanda" || normalized === "libreville" || normalized === "owendo") {
    return "Estuaire";
  }
  if (normalized === "port-gentil") {
    return "Ogooué-Maritime";
  }
  if (normalized === "franceville") {
    return "Haut-Ogooué";
  }
  return null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function extractMediaUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const urls: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed) {
        urls.push(trimmed);
      }
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const url = toNullableString((item as { url?: unknown }).url);
      if (url) {
        urls.push(url);
      }
    }
  }
  return Array.from(new Set(urls));
}

function matchesDateRange(value: string | null, startedFrom: string | null, startedTo: string | null) {
  if (!startedFrom && !startedTo) {
    return true;
  }

  const itemTimestamp = toTimestamp(value);
  if (itemTimestamp == null) {
    return false;
  }

  const startTimestamp = toTimestamp(startedFrom);
  const endTimestamp = toTimestamp(startedTo);

  if (startTimestamp != null && itemTimestamp < startTimestamp) {
    return false;
  }
  if (endTimestamp != null && itemTimestamp > endTimestamp) {
    return false;
  }
  return true;
}

function isStaleRunningJob(job: SocialImportJob, nowTimestamp: number) {
  if (job.status !== "running") {
    return false;
  }
  const startedTimestamp = toTimestamp(job.startedAt ?? job.createdAt);
  if (startedTimestamp == null) {
    return false;
  }
  return nowTimestamp - startedTimestamp >= SOCIAL_IMPORT_STALE_RUNNING_TIMEOUT_MS;
}

function matchesSearch(haystack: string[], query: string) {
  if (!query) {
    return true;
  }
  return haystack.join(" ").toLowerCase().includes(query);
}

function normalizeSourceType(value?: string): SocialImportSource["sourceType"] | null {
  if (value === "profile" || value === "page" || value === "group_user") {
    return value;
  }
  return null;
}

function normalizeSourceStatusValue(value?: string): SocialImportSourceStatus | null {
  if (value === "active" || value === "paused" || value === "revoked") {
    return value;
  }
  return null;
}

function normalizeEnvironment(value?: string): SocialImportEnvironment {
  if (value === "preprod" || value === "prod") {
    return value;
  }
  return "dev";
}

function normalizeStringList(values?: string[] | null) {
  if (!Array.isArray(values)) {
    return [] as string[];
  }
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function buildIdempotencyFingerprint(scope: string, payload: Record<string, unknown>) {
  return createHash("sha256")
    .update(JSON.stringify({ scope, payload }))
    .digest("hex");
}

function canTransitionSourceStatus(from: SocialImportSourceStatus, to: SocialImportSourceStatus) {
  if (from === to) {
    return true;
  }
  if (from === "revoked") {
    return false;
  }
  if (from === "active" && (to === "paused" || to === "revoked")) {
    return true;
  }
  if (from === "paused" && (to === "active" || to === "revoked")) {
    return true;
  }
  return false;
}

function normalizeSchedulerEnvironment(
  value?: string | null,
): SocialImportSchedulerEnvironment {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "preprod" || normalized === "prod") {
    return normalized;
  }
  return "dev";
}

function resolveDefaultSocialImportSettings(): SocialImportSettings {
  return {
    id: "global",
    thresholds: {
      autoPublishMinScore: 0.82,
      autoRejectMaxScore: 0.3,
      defaultRunLimit: 400,
      maxRunLimit: 1000,
    },
    scheduler: {
      enabled: false,
      cronExpression: "0 2 28-31 * *",
      timezone: "Africa/Dakar",
      environment: "prod",
      includeImported: false,
      headless: true,
      defaultReason: "Import social planifie depuis le dashboard admin.",
    },
    orchestrator: {
      executionMode: "local",
      orchestratorUrlConfigured: false,
      allowLocalProd: true,
    },
    updatedBy: null,
    updatedAt: null,
    createdAt: null,
  };
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function hasListingCoreFields(payload: Record<string, unknown>) {
  const title = payload.title;
  const description = payload.description;
  const typeProperty = payload.typeProperty;
  const status = payload.status;
  return (
    typeof title === "string" &&
    title.trim().length > 0 &&
    typeof description === "string" &&
    description.trim().length > 0 &&
    typeof typeProperty === "string" &&
    typeProperty.trim().length > 0 &&
    typeof status === "string" &&
    status.trim().length > 0
  );
}

function extractListingPayloadFromCandidate(rawData: Record<string, unknown>) {
  const payload = asRecord(rawData.payload);
  const candidates: Array<Record<string, unknown> | null> = [
    asRecord(rawData.listing),
    asRecord(rawData.listingDraft),
    asRecord(rawData.normalizedListing),
    asRecord(rawData.normalized),
    asRecord(rawData.structured),
    asRecord(rawData.formattedListing),
    payload ? asRecord(payload.listing) : null,
    payload ? asRecord(payload.listingDraft) : null,
    payload ? asRecord(payload.normalizedListing) : null,
    payload ? asRecord(payload.normalized) : null,
  ];

  for (const candidate of candidates) {
    if (candidate && hasListingCoreFields(candidate)) {
      return candidate;
    }
  }

  if (hasListingCoreFields(rawData)) {
    return rawData;
  }

  return null;
}

function normalizeCreateListingInputFromCandidate(input: {
  announcerUid: string;
  rawData: Record<string, unknown>;
}): CreateListingForAnnouncerInput {
  const payload = extractListingPayloadFromCandidate(input.rawData);
  if (!payload) {
    throw new Error("SOCIAL_IMPORT_CANDIDATE_LISTING_PAYLOAD_MISSING");
  }

  const parsed = listingFullSchema.safeParse({
    ...payload,
    images: Array.isArray(payload.images)
      ? normalizeImages(
          payload.images as Array<string | { fileURL: string; filePATH?: string }>,
        )
      : payload.images,
  });

  if (!parsed.success) {
    throw new Error("SOCIAL_IMPORT_CANDIDATE_LISTING_PAYLOAD_INVALID");
  }

  return {
    announcerUid: input.announcerUid,
    ...parsed.data,
    images: normalizeImages(parsed.data.images),
  };
}

export async function listSocialImportSources(
  input: ListSocialImportSourcesInput,
): Promise<ListSocialImportSourcesResult> {
  const safeLimit = Math.max(1, Math.min(500, input.limit || 200));
  const requestedCursor = input.cursor?.trim() || null;
  const query = normalizeQuery(input.query);
  const platform = normalizePlatform(input.platform);
  const status = normalizeSourceStatus(input.status);
  const announcerUid = normalizeUid(input.announcerUid);
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;
  const filtered: ListSocialImportSourcesResult["sources"] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;

    const page = await listSocialImportSourcesRawPage({
      limit: scanLimit,
      cursor,
    });

    if (page.items.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.items.length;

    for (let index = 0; index < page.items.length; index += 1) {
      const source = page.items[index];
      cursor = source.id;

      const keep =
        (!announcerUid || source.announcerUid.toLowerCase() === announcerUid) &&
        (platform === "all" || source.platform === platform) &&
        (status === "all" || source.status === status) &&
        matchesSearch(
          [
            source.id,
            source.announcerUid,
            source.sourceUrl,
            source.sourceType,
            source.status,
            source.consent.proofRef ?? "",
            source.consent.grantedBy ?? "",
          ],
          query,
        );

      if (keep) {
        filtered.push(source);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.items.length - 1 || page.hasMore;
        break;
      }
    }

    if (filtered.length === safeLimit) {
      break;
    }

    if (!page.hasMore) {
      hasMoreRaw = false;
      break;
    }
  }

  const scanLimited = hasMoreRaw && filtered.length < safeLimit && scannedDocs >= MAX_SCAN_DOCS;
  if (scanLimited) {
    hasMore = true;
  }

  return {
    sources: filtered,
    count: filtered.length,
    totalCount: null,
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      announcerUid,
      platform,
      status,
      query,
      limit: safeLimit,
    },
  };
}

export async function listSocialImportJobs(
  input: ListSocialImportJobsInput,
): Promise<ListSocialImportJobsResult> {
  const safeLimit = Math.max(1, Math.min(500, input.limit || 200));
  const requestedCursor = input.cursor?.trim() || null;
  const query = normalizeQuery(input.query);
  const status = normalizeJobStatus(input.status);
  const announcerUid = normalizeUid(input.announcerUid);
  const startedFrom = normalizeDateInput(input.startedFrom);
  const startedTo = normalizeDateInput(input.startedTo);
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));
  const nowTimestamp = Date.now();

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;
  const filtered: ListSocialImportJobsResult["jobs"] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;

    const page = await listSocialImportJobsRawPage({
      limit: scanLimit,
      cursor,
    });

    if (page.items.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.items.length;

    for (let index = 0; index < page.items.length; index += 1) {
      const job = page.items[index];
      cursor = job.id;
      let effectiveJob = job;

      if (isStaleRunningJob(job, nowTimestamp)) {
        const stalePatch = {
          status: "failed" as const,
          endedAt: new Date(nowTimestamp).toISOString(),
          errorSummary: job.errorSummary ?? "SOCIAL_IMPORT_STALE_RUNNING_TIMEOUT",
        };

        await patchSocialImportJobById({
          jobId: job.id,
          patch: stalePatch,
        }).catch(() => undefined);

        effectiveJob = {
          ...job,
          ...stalePatch,
        };
      }

      const jobDate = effectiveJob.startedAt ?? effectiveJob.createdAt;

      const keep =
        (status === "all" || effectiveJob.status === status) &&
        (!announcerUid ||
          effectiveJob.announcerScope.some((uid) => uid.toLowerCase() === announcerUid)) &&
        matchesDateRange(jobDate, startedFrom, startedTo) &&
        matchesSearch(
          [
            effectiveJob.id,
            effectiveJob.status,
            effectiveJob.mode,
            effectiveJob.environment,
            effectiveJob.errorSummary ?? "",
            effectiveJob.triggeredBy ?? "",
            ...effectiveJob.announcerScope,
          ],
          query,
        );

      if (keep) {
        filtered.push(effectiveJob);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.items.length - 1 || page.hasMore;
        break;
      }
    }

    if (filtered.length === safeLimit) {
      break;
    }

    if (!page.hasMore) {
      hasMoreRaw = false;
      break;
    }
  }

  const scanLimited = hasMoreRaw && filtered.length < safeLimit && scannedDocs >= MAX_SCAN_DOCS;
  if (scanLimited) {
    hasMore = true;
  }

  return {
    jobs: filtered,
    count: filtered.length,
    totalCount: null,
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      status,
      announcerUid,
      query,
      startedFrom: startedFrom ?? "",
      startedTo: startedTo ?? "",
      limit: safeLimit,
    },
  };
}

export async function getSocialImportJobDetails(jobId: string) {
  const safeJobId = jobId.trim();
  if (!safeJobId) {
    return null;
  }
  return getSocialImportJobById(safeJobId);
}

export async function getSocialImportJobLogs(input: { jobId: string }) {
  const safeJobId = input.jobId.trim();
  if (!safeJobId) {
    throw new Error("SOCIAL_IMPORT_JOB_ID_INVALID");
  }

  const job = await getSocialImportJobById(safeJobId);
  if (!job) {
    throw new Error("SOCIAL_IMPORT_JOB_NOT_FOUND");
  }

  const scraperRoot =
    process.env.SOCIAL_IMPORT_SCRAPER_ROOT?.trim() ||
    null;
  const sourceUrl =
    typeof job.metadata?.sourceUrl === "string"
      ? job.metadata.sourceUrl
      : null;
  const callbackIngestedAt =
    typeof job.metadata?.resultIngestedAt === "string"
      ? job.metadata.resultIngestedAt
      : null;
  const runDateFrom =
    typeof job.metadata?.dateFrom === "string" ? job.metadata.dateFrom : null;
  const runDateTo =
    typeof job.metadata?.dateTo === "string" ? job.metadata.dateTo : null;

  const hints: string[] = [];
  if (job.status === "running") {
    hints.push("Le job est encore en cours: surveille le terminal local qui exécute le scraper.");
  }
  if (job.status === "failed" && job.errorSummary) {
    hints.push(`Résumé erreur: ${job.errorSummary}`);
  }
  if (job.counters.rawFetched === 0) {
    hints.push("Aucun post brut récupéré (fetch=0). Vérifie l'accès à la source ou la période.");
  }
  if (job.counters.needsReview === 0 && job.counters.normalizedOk === 0) {
    hints.push("Aucune candidate review produite pour ce job.");
  }
  if (runDateFrom || runDateTo) {
    hints.push(
      `Période appliquée: ${runDateFrom ?? "N/A"} -> ${runDateTo ?? "N/A"}.`,
    );
  }
  if (sourceUrl) {
    hints.push(`Source ciblée: ${sourceUrl}`);
  }
  if (scraperRoot) {
    hints.push(`Racine scraper locale: ${scraperRoot}`);
    hints.push(
      `Sortie annonces normalisées: ${scraperRoot}/storage/exports/location-maison-fine-tuning/annonces/ready-with-images/by-raw-post`,
    );
    hints.push(
      `Sortie posts bruts: ${scraperRoot}/storage/raw/posts`,
    );
  }

  return {
    job,
    logs: {
      cloudRun: null,
      orchestratorUrl: null,
      externalRunId:
        typeof job.metadata?.externalRunId === "string"
          ? job.metadata.externalRunId
          : null,
      callbackIngestedAt,
      hints,
    },
  };
}

export async function cancelSocialImportJob(input: {
  jobId: string;
  actorUid: string;
  reason?: string | null;
  correlationId: string;
}) {
  void input.correlationId;
  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const jobId = input.jobId.trim();
  if (!jobId) {
    throw new Error("SOCIAL_IMPORT_JOB_ID_INVALID");
  }

  const reason = (input.reason ?? "").trim();
  const job = await getSocialImportJobById(jobId);
  if (!job) {
    throw new Error("SOCIAL_IMPORT_JOB_NOT_FOUND");
  }

  if (job.status !== "running") {
    throw new Error("SOCIAL_IMPORT_JOB_CANCEL_STATUS_INVALID");
  }

  const endedAt = new Date().toISOString();
  const cancellationReason = reason || "Annulation demandée depuis dashboard admin.";
  const errorSummary = [
    "SOCIAL_IMPORT_CANCELLED_BY_ADMIN",
    `reason=${cancellationReason}`,
    "mode=local",
  ].join(" | ");

  const patchResult = await patchSocialImportJobById({
    jobId,
    patch: {
      status: "failed",
      endedAt,
      errorSummary,
      metadata: {
        ...(job.metadata ?? {}),
        cancelledBy: actorUid,
        cancelledAt: endedAt,
        cancellationReason,
      },
    },
  });

  if (!patchResult) {
    throw new Error("SOCIAL_IMPORT_JOB_CANCEL_PATCH_FAILED");
  }

  return {
    before: patchResult.before,
    after: patchResult.after,
    orchestratorCancel: {
      attempted: false,
      accepted: false,
      message: "LOCAL_MODE_NO_REMOTE_CANCEL",
    },
  };
}

export async function listSocialImportReview(
  input: ListSocialImportReviewInput,
): Promise<ListSocialImportReviewResult> {
  const safeLimit = Math.max(1, Math.min(500, input.limit || 200));
  const requestedCursor = input.cursor?.trim() || null;
  const query = normalizeQuery(input.query);
  const status = normalizeReviewStatus(input.status);
  const announcerUid = normalizeUid(input.announcerUid);
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;
  const filtered: ListSocialImportReviewResult["candidates"] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;

    const page = await listSocialImportReviewRawPage({
      limit: scanLimit,
      cursor,
    });

    if (page.items.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.items.length;

    for (let index = 0; index < page.items.length; index += 1) {
      const candidate = page.items[index];
      cursor = candidate.id;

      const keep =
        (status === "all" || candidate.status === status) &&
        (!announcerUid || candidate.announcerUid.toLowerCase() === announcerUid) &&
        matchesSearch(
          [
            candidate.id,
            candidate.rawPostId,
            candidate.announcerUid,
            candidate.sourcePostUrl ?? "",
            candidate.autoReason ?? "",
          ],
          query,
        );

      if (keep) {
        filtered.push(candidate);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.items.length - 1 || page.hasMore;
        break;
      }
    }

    if (filtered.length === safeLimit) {
      break;
    }

    if (!page.hasMore) {
      hasMoreRaw = false;
      break;
    }
  }

  const scanLimited = hasMoreRaw && filtered.length < safeLimit && scannedDocs >= MAX_SCAN_DOCS;
  if (scanLimited) {
    hasMore = true;
  }

  return {
    candidates: filtered,
    count: filtered.length,
    totalCount: null,
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      status,
      announcerUid,
      query,
      limit: safeLimit,
    },
  };
}

export async function listSocialImportDecisions(
  input: ListSocialImportDecisionsInput,
): Promise<ListSocialImportDecisionsResult> {
  const safeLimit = Math.max(1, Math.min(500, input.limit || 200));
  const requestedCursor = input.cursor?.trim() || null;
  const query = normalizeQuery(input.query);
  const decision = normalizeDecisionFilter(input.decision);
  const announcerUid = normalizeUid(input.announcerUid);
  const jobId = input.jobId?.trim() ?? "";
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;
  const filtered: ListSocialImportDecisionsResult["decisions"] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;

    const page = await listSocialImportDecisionsRawPage({
      limit: scanLimit,
      cursor,
    });

    if (page.items.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.items.length;

    for (let index = 0; index < page.items.length; index += 1) {
      const item = page.items[index];
      cursor = item.id;

      const keep =
        (decision === "all" || item.decision === decision) &&
        (!jobId || item.jobId === jobId) &&
        (!announcerUid || (item.announcerUid ?? "").toLowerCase() === announcerUid) &&
        matchesSearch(
          [item.id, item.rawPostId ?? "", item.actorId ?? "", item.reason ?? "", item.decision],
          query,
        );

      if (keep) {
        filtered.push(item);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.items.length - 1 || page.hasMore;
        break;
      }
    }

    if (filtered.length === safeLimit) {
      break;
    }

    if (!page.hasMore) {
      hasMoreRaw = false;
      break;
    }
  }

  const scanLimited = hasMoreRaw && filtered.length < safeLimit && scannedDocs >= MAX_SCAN_DOCS;
  if (scanLimited) {
    hasMore = true;
  }

  return {
    decisions: filtered,
    count: filtered.length,
    totalCount: null,
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      decision,
      jobId,
      announcerUid,
      query,
      limit: safeLimit,
    },
  };
}

export async function getSocialImportSettings() {
  const stored = await getSocialImportSettingsRecord();
  const defaults = resolveDefaultSocialImportSettings();

  if (!stored) {
    return defaults;
  }

  return {
    ...stored,
    orchestrator: {
      ...stored.orchestrator,
      orchestratorUrlConfigured: false,
      executionMode: "local",
      allowLocalProd: true,
    },
  };
}

export async function updateSocialImportSettings(input: {
  actorUid: string;
  patch: Partial<{
    thresholds: Partial<SocialImportSettings["thresholds"]>;
    scheduler: Partial<SocialImportSettings["scheduler"]>;
  }>;
}) {
  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const hasPatch =
    Boolean(input.patch.thresholds) ||
    Boolean(input.patch.scheduler);
  if (!hasPatch) {
    throw new Error("SOCIAL_IMPORT_SETTINGS_PATCH_EMPTY");
  }

  const current = await getSocialImportSettings();
  const nextThresholds = {
    ...current.thresholds,
    ...(input.patch.thresholds ?? {}),
  };

  if (
    nextThresholds.autoPublishMinScore < 0 ||
    nextThresholds.autoPublishMinScore > 1 ||
    nextThresholds.autoRejectMaxScore < 0 ||
    nextThresholds.autoRejectMaxScore > 1 ||
    nextThresholds.defaultRunLimit < 1 ||
    nextThresholds.maxRunLimit < 1 ||
    nextThresholds.defaultRunLimit > nextThresholds.maxRunLimit
  ) {
    throw new Error("SOCIAL_IMPORT_SETTINGS_THRESHOLDS_INVALID");
  }

  const schedulerPatch = input.patch.scheduler ?? {};
  if (schedulerPatch.cronExpression !== undefined) {
    const cron = schedulerPatch.cronExpression.trim();
    if (!cron || cron.split(/\s+/).length < 5) {
      throw new Error("SOCIAL_IMPORT_SCHEDULER_CRON_INVALID");
    }
  }
  if (schedulerPatch.timezone !== undefined) {
    const timezone = schedulerPatch.timezone.trim();
    if (!timezone) {
      throw new Error("SOCIAL_IMPORT_SCHEDULER_TIMEZONE_INVALID");
    }
  }

  const patched = await upsertSocialImportSettings({
    updatedBy: actorUid,
    patch: {
      thresholds: {
        autoPublishMinScore: nextThresholds.autoPublishMinScore,
        autoRejectMaxScore: nextThresholds.autoRejectMaxScore,
        defaultRunLimit: Math.floor(nextThresholds.defaultRunLimit),
        maxRunLimit: Math.floor(nextThresholds.maxRunLimit),
      },
      scheduler: schedulerPatch.environment
        ? {
            ...schedulerPatch,
            environment: normalizeSchedulerEnvironment(
              schedulerPatch.environment,
            ),
          }
        : schedulerPatch,
      orchestrator: {
        executionMode: "local",
        orchestratorUrlConfigured: false,
        allowLocalProd: true,
      },
    },
  });

  return patched;
}

export async function toggleSocialImportScheduler(input: {
  actorUid: string;
  enabled: boolean;
  reason: string;
}) {
  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("SOCIAL_IMPORT_REASON_REQUIRED");
  }

  const current = await getSocialImportSettings();
  const settings = await upsertSocialImportSettings({
    updatedBy: actorUid,
    patch: {
      scheduler: {
        enabled: input.enabled,
      },
    },
  });

  return {
    before: current.scheduler.enabled,
    after: settings.scheduler.enabled,
  };
}

type UpsertSourceConsentInput = Partial<{
  grantedAt: string | null;
  grantedBy: string | null;
  proofRef: string | null;
  expiresAt: string | null;
}>;

function parseOptionalIsoDate(
  value: string | null | undefined,
  errorCode: string,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(errorCode);
  }
  return parsed.toISOString();
}

function validateSourceUrl(sourceUrl: string) {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("SOCIAL_IMPORT_SOURCE_URL_REQUIRED");
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("SOCIAL_IMPORT_SOURCE_URL_INVALID");
    }
  } catch {
    throw new Error("SOCIAL_IMPORT_SOURCE_URL_INVALID");
  }

  return trimmed;
}

function mergeConsentState(
  current: SocialImportSource["consent"],
  patch: UpsertSourceConsentInput,
) {
  const merged = {
    grantedAt:
      patch.grantedAt === undefined
        ? current.grantedAt
        : parseOptionalIsoDate(
            patch.grantedAt,
            "SOCIAL_IMPORT_CONSENT_GRANTED_AT_INVALID",
          ) ?? null,
    grantedBy:
      patch.grantedBy === undefined
        ? current.grantedBy
        : (patch.grantedBy ?? "").trim() || null,
    proofRef:
      patch.proofRef === undefined
        ? current.proofRef
        : (patch.proofRef ?? "").trim() || null,
    expiresAt:
      patch.expiresAt === undefined
        ? current.expiresAt
        : parseOptionalIsoDate(
            patch.expiresAt,
            "SOCIAL_IMPORT_CONSENT_EXPIRES_AT_INVALID",
          ) ?? null,
  };

  if (merged.grantedAt && (!merged.grantedBy || !merged.proofRef)) {
    throw new Error("SOCIAL_IMPORT_CONSENT_PROOF_REQUIRED");
  }

  if (merged.grantedAt && merged.expiresAt) {
    const grantedAtTimestamp = toTimestamp(merged.grantedAt);
    const expiresAtTimestamp = toTimestamp(merged.expiresAt);
    if (
      grantedAtTimestamp != null &&
      expiresAtTimestamp != null &&
      expiresAtTimestamp < grantedAtTimestamp
    ) {
      throw new Error("SOCIAL_IMPORT_CONSENT_DATE_RANGE_INVALID");
    }
  }

  return merged;
}

export type CreateSocialImportSourceInput = {
  announcerUid: string;
  platform: SocialImportPlatform;
  sourceUrl: string;
  sourceType: SocialImportSource["sourceType"];
  status?: SocialImportSourceStatus;
  consent?: UpsertSourceConsentInput | null;
  actorUid: string;
};

export async function createSocialImportSource(
  input: CreateSocialImportSourceInput,
) {
  const announcerUid = input.announcerUid.trim();
  if (!announcerUid) {
    throw new Error("SOCIAL_IMPORT_SOURCE_ANNOUNCER_UID_REQUIRED");
  }

  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const platform = normalizePlatform(input.platform);
  if (platform === "all") {
    throw new Error("SOCIAL_IMPORT_SOURCE_PLATFORM_INVALID");
  }

  const sourceType = normalizeSourceType(input.sourceType);
  if (!sourceType) {
    throw new Error("SOCIAL_IMPORT_SOURCE_TYPE_INVALID");
  }

  const sourceStatus = normalizeSourceStatusValue(input.status ?? "active");
  if (!sourceStatus) {
    throw new Error("SOCIAL_IMPORT_SOURCE_STATUS_INVALID");
  }

  const sourceUrl = validateSourceUrl(input.sourceUrl);
  const consent = mergeConsentState(
    {
      grantedAt: null,
      grantedBy: null,
      proofRef: null,
      expiresAt: null,
    },
    input.consent ?? {},
  );

  const created = await createSocialImportSourceRecord({
    announcerUid,
    platform,
    sourceUrl,
    sourceType,
    status: sourceStatus,
    consent,
    createdBy: actorUid,
  });

  return { source: created };
}

export type UpdateSocialImportSourceInput = {
  sourceId: string;
  patch: Partial<{
    platform: SocialImportPlatform;
    sourceUrl: string;
    sourceType: SocialImportSource["sourceType"];
    status: SocialImportSourceStatus;
  }>;
  actorUid: string;
};

export async function updateSocialImportSource(
  input: UpdateSocialImportSourceInput,
) {
  const sourceId = input.sourceId.trim();
  if (!sourceId) {
    throw new Error("SOCIAL_IMPORT_SOURCE_ID_INVALID");
  }

  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const before = await getSocialImportSourceById(sourceId);
  if (!before) {
    return null;
  }

  const patch: UpdateSocialImportSourceInput["patch"] = {};

  if (input.patch.platform !== undefined) {
    const platform = normalizePlatform(input.patch.platform);
    if (platform === "all") {
      throw new Error("SOCIAL_IMPORT_SOURCE_PLATFORM_INVALID");
    }
    patch.platform = platform;
  }

  if (input.patch.sourceUrl !== undefined) {
    patch.sourceUrl = validateSourceUrl(input.patch.sourceUrl);
  }

  if (input.patch.sourceType !== undefined) {
    const sourceType = normalizeSourceType(input.patch.sourceType);
    if (!sourceType) {
      throw new Error("SOCIAL_IMPORT_SOURCE_TYPE_INVALID");
    }
    patch.sourceType = sourceType;
  }

  if (input.patch.status !== undefined) {
    const status = normalizeSourceStatusValue(input.patch.status);
    if (!status) {
      throw new Error("SOCIAL_IMPORT_SOURCE_STATUS_INVALID");
    }
    if (!canTransitionSourceStatus(before.status, status)) {
      throw new Error("SOCIAL_IMPORT_SOURCE_STATUS_TRANSITION_FORBIDDEN");
    }
    patch.status = status;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("SOCIAL_IMPORT_SOURCE_PATCH_EMPTY");
  }

  const mutation = await patchSocialImportSourceById({
    sourceId,
    patch,
    updatedBy: actorUid,
  });

  if (!mutation) {
    return null;
  }

  return mutation;
}

export async function pauseSocialImportSource(input: {
  sourceId: string;
  reason: string;
  actorUid: string;
}) {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("SOCIAL_IMPORT_REASON_REQUIRED");
  }

  const sourceId = input.sourceId.trim();
  if (!sourceId) {
    throw new Error("SOCIAL_IMPORT_SOURCE_ID_INVALID");
  }

  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const before = await getSocialImportSourceById(sourceId);
  if (!before) {
    return null;
  }

  if (before.status === "revoked") {
    throw new Error("SOCIAL_IMPORT_SOURCE_STATUS_TRANSITION_FORBIDDEN");
  }

  if (before.status === "paused") {
    return { before, after: before, changed: false };
  }

  const mutation = await patchSocialImportSourceById({
    sourceId,
    patch: {
      status: "paused",
    },
    updatedBy: actorUid,
  });

  if (!mutation) {
    return null;
  }

  return { ...mutation, changed: true };
}

export async function revokeSocialImportSource(input: {
  sourceId: string;
  reason: string;
  actorUid: string;
}) {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("SOCIAL_IMPORT_REASON_REQUIRED");
  }

  const sourceId = input.sourceId.trim();
  if (!sourceId) {
    throw new Error("SOCIAL_IMPORT_SOURCE_ID_INVALID");
  }

  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const before = await getSocialImportSourceById(sourceId);
  if (!before) {
    return null;
  }

  if (before.status === "revoked") {
    return { before, after: before, changed: false };
  }

  const mutation = await patchSocialImportSourceById({
    sourceId,
    patch: {
      status: "revoked",
    },
    updatedBy: actorUid,
  });

  if (!mutation) {
    return null;
  }

  return { ...mutation, changed: true };
}

export async function updateSocialImportSourceConsent(input: {
  sourceId: string;
  consent: UpsertSourceConsentInput;
  actorUid: string;
}) {
  const sourceId = input.sourceId.trim();
  if (!sourceId) {
    throw new Error("SOCIAL_IMPORT_SOURCE_ID_INVALID");
  }

  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const before = await getSocialImportSourceById(sourceId);
  if (!before) {
    return null;
  }

  const hasConsentChanges =
    input.consent.grantedAt !== undefined ||
    input.consent.grantedBy !== undefined ||
    input.consent.proofRef !== undefined ||
    input.consent.expiresAt !== undefined;

  if (!hasConsentChanges) {
    throw new Error("SOCIAL_IMPORT_CONSENT_PATCH_EMPTY");
  }

  const mergedConsent = mergeConsentState(before.consent, input.consent);
  const mutation = await patchSocialImportSourceConsent({
    sourceId,
    consent: mergedConsent,
    updatedBy: actorUid,
  });

  if (!mutation) {
    return null;
  }

  return mutation;
}

function resolveDryRunSummary(value: unknown): { jobId: string } | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const jobId =
    "jobId" in value && typeof value.jobId === "string"
      ? value.jobId.trim()
      : "";
  return jobId ? { jobId } : null;
}

function resolveAllowedRetryStatus(status: SocialImportJob["status"]) {
  return status === "failed" || status === "partial" || status === "needs_review";
}

function normalizeCandidateImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function normalizeReviewCandidateStatus(
  value: unknown,
): "ready_to_publish" | "needs_review" | "rejected" | "published" {
  const status = String(value ?? "").trim();
  if (
    status === "ready_to_publish" ||
    status === "needs_review" ||
    status === "rejected" ||
    status === "published"
  ) {
    return status;
  }
  return "needs_review";
}

function toNullableFiniteNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toSafeCounterValue(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  if (value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

function normalizeJobResultStatus(
  value: unknown,
): "running" | "completed" | "failed" | "partial" | "needs_review" | null {
  const status = String(value ?? "").trim();
  if (
    status === "running" ||
    status === "completed" ||
    status === "failed" ||
    status === "partial" ||
    status === "needs_review"
  ) {
    return status;
  }
  return null;
}

export async function ingestSocialImportJobResult(input: {
  jobId: string;
  status?: SocialImportJob["status"] | null;
  errorSummary?: string | null;
  counters?: Partial<SocialImportJob["counters"]> | null;
  candidates?: Array<{
    id: string;
    jobId?: string | null;
    announcerUid?: string | null;
    sourceId?: string | null;
    rawPostId: string;
    sourcePostUrl?: string | null;
    title?: string | null;
    typeProperty?: string | null;
    price?: number | null;
    city?: string | null;
    province?: string | null;
    imageUrls?: string[] | null;
    status?: "ready_to_publish" | "needs_review" | "rejected" | "published" | null;
    autoReason?: string | null;
    score?: number | null;
    payload?: Record<string, unknown> | null;
    listing?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }> | null;
  metadata?: Record<string, unknown> | null;
}) {
  const jobId = input.jobId.trim();
  if (!jobId) {
    throw new Error("SOCIAL_IMPORT_JOB_ID_INVALID");
  }

  const job = await getSocialImportJobById(jobId);
  if (!job) {
    throw new Error("SOCIAL_IMPORT_JOB_NOT_FOUND");
  }

  const nowIso = new Date().toISOString();
  const normalizedCandidates = (input.candidates ?? [])
    .map((candidate) => {
      const rawPostId = String(candidate.rawPostId ?? "").trim();
      if (!rawPostId) {
        return null;
      }
      const announcerUid =
        toNullableString(candidate.announcerUid) ||
        job.announcerScope[0] ||
        null;
      if (!announcerUid) {
        return null;
      }

      return {
        id: toNullableString(candidate.id) || rawPostId,
        jobId: toNullableString(candidate.jobId) || jobId,
        announcerUid,
        sourceId: toNullableString(candidate.sourceId),
        rawPostId,
        sourcePostUrl: toNullableString(candidate.sourcePostUrl),
        title: toNullableString(candidate.title),
        typeProperty: toNullableString(candidate.typeProperty),
        price: toNullableFiniteNumber(candidate.price),
        city: toNullableString(candidate.city),
        province: toNullableString(candidate.province),
        imageUrls: normalizeCandidateImageUrls(candidate.imageUrls ?? []),
        status: normalizeReviewCandidateStatus(candidate.status),
        autoReason: toNullableString(candidate.autoReason),
        score: toNullableFiniteNumber(candidate.score),
        payload: asRecord(candidate.payload) ?? null,
        listing: asRecord(candidate.listing) ?? null,
        metadata: asRecord(candidate.metadata) ?? null,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  const reviewSync =
    normalizedCandidates.length > 0
      ? await upsertSocialImportReviewCandidates({
          candidates: normalizedCandidates,
        })
      : null;

  const previousCounters = job.counters;
  const incomingCounters = input.counters ?? {};

  const counters = {
    rawFetched: toSafeCounterValue(
      incomingCounters.rawFetched,
      previousCounters.rawFetched,
    ),
    normalizedOk: toSafeCounterValue(
      incomingCounters.normalizedOk,
      previousCounters.normalizedOk,
    ),
    needsReview: toSafeCounterValue(
      incomingCounters.needsReview,
      previousCounters.needsReview,
    ),
    published: toSafeCounterValue(
      incomingCounters.published,
      previousCounters.published,
    ),
    rejected: toSafeCounterValue(
      incomingCounters.rejected,
      previousCounters.rejected,
    ),
  };

  if (reviewSync) {
    counters.needsReview = reviewSync.needsReview;
    counters.normalizedOk = Math.max(counters.normalizedOk, reviewSync.readyToPublish);
    counters.rejected = Math.max(counters.rejected, reviewSync.rejected);
  }

  const normalizedStatus = normalizeJobResultStatus(input.status);
  const hasErrorSummary = toNullableString(input.errorSummary);
  const status =
    normalizedStatus && normalizedStatus !== "running"
      ? normalizedStatus
      : hasErrorSummary
        ? "failed"
        : counters.needsReview > 0 && counters.normalizedOk === 0
          ? "needs_review"
          : "completed";

  const patchResult = await patchSocialImportJobById({
    jobId,
    patch: {
      status,
      endedAt: nowIso,
      errorSummary: hasErrorSummary,
      counters,
      metadata: {
        ...(job.metadata ?? {}),
        ...(asRecord(input.metadata) ?? {}),
        resultIngestedAt: nowIso,
        resultIngestedFrom: "social_import_callback",
        candidatesReceivedCount: normalizedCandidates.length,
      },
    },
  });

  if (!patchResult) {
    throw new Error("SOCIAL_IMPORT_JOB_RESULT_PATCH_FAILED");
  }

  const sourceId =
    typeof patchResult.after.metadata?.sourceId === "string"
      ? patchResult.after.metadata.sourceId.trim()
      : "";
  if (sourceId) {
    await patchSocialImportSourceById({
      sourceId,
      updatedBy: "system:social-import-callback",
      patch: {
        lastImportAt: nowIso,
      },
    }).catch(() => undefined);
  }

  return {
    before: patchResult.before,
    after: patchResult.after,
    reviewSync,
    acceptedCandidates: normalizedCandidates.length,
  };
}

export async function triggerSocialImportRun(input: {
  actorUid: string;
  sourceId?: string | null;
  announcerUid?: string | null;
  environment?: SocialImportEnvironment;
  reason?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number | null;
  includeImported?: boolean | null;
  headless?: boolean | null;
  idempotencyKey?: string | null;
  correlationId: string;
}) {
  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const sourceId = input.sourceId?.trim() || "";
  const announcerUidInput = input.announcerUid?.trim() || "";
  if (!sourceId && !announcerUidInput) {
    throw new Error("SOCIAL_IMPORT_RUN_SCOPE_REQUIRED");
  }

  let source: SocialImportSource | null = null;
  if (sourceId) {
    source = await getSocialImportSourceById(sourceId);
    if (!source) {
      throw new Error("SOCIAL_IMPORT_SOURCE_NOT_FOUND");
    }
  }

  const announcerUid = (announcerUidInput || source?.announcerUid || "").trim();
  if (!announcerUid) {
    throw new Error("SOCIAL_IMPORT_SOURCE_ANNOUNCER_UID_REQUIRED");
  }

  const environment = normalizeEnvironment(input.environment);
  const reason = (input.reason ?? "").trim();

  const settings = await getSocialImportSettings();
  const defaultLimit = Math.max(1, Math.floor(settings.thresholds.defaultRunLimit));
  const maxRunLimit = Math.max(defaultLimit, Math.floor(settings.thresholds.maxRunLimit));

  const safeLimit = Math.max(
    1,
    Math.min(
      maxRunLimit,
      Number.isFinite(Number(input.limit)) ? Number(input.limit) : defaultLimit,
    ),
  );
  const includeImportedDefault = true;
  const includeImported =
    input.includeImported === null
      ? includeImportedDefault
      : Boolean(input.includeImported ?? includeImportedDefault);
  const headless = input.headless === null ? false : Boolean(input.headless ?? false);

  const dateFrom = normalizeDateInput(input.dateFrom ?? undefined);
  const dateTo = normalizeDateInput(input.dateTo ?? undefined);
  if (dateFrom && dateTo) {
    const fromTs = toTimestamp(dateFrom);
    const toTs = toTimestamp(dateTo);
    if (fromTs != null && toTs != null && fromTs > toTs) {
      throw new Error("SOCIAL_IMPORT_RUN_DATE_RANGE_INVALID");
    }
  }

  const idempotencyKey = input.idempotencyKey?.trim() || null;
  const fingerprint = buildIdempotencyFingerprint("social_import.jobs.run", {
    sourceId: source?.id ?? null,
    announcerUid,
    environment,
    reason,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    limit: safeLimit,
    includeImported,
    headless,
  });

  let hasClaim = false;
  if (idempotencyKey) {
    const claim = await claimSocialImportIdempotency({
      scope: "social_import.jobs.run",
      idempotencyKey,
      requestFingerprint: fingerprint,
      correlationId: input.correlationId,
      parseSummary: resolveDryRunSummary,
    });

    if (claim.status === "conflict") {
      throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT");
    }
    if (claim.status === "in_progress") {
      throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS");
    }
    if (claim.status === "replay") {
      const replayJob = await getSocialImportJobById(claim.summary.jobId);
      if (!replayJob) {
        throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_REPLAY_NOT_FOUND");
      }
      return {
        job: replayJob,
        replayed: true,
        dispatch: {
          mode: "local_command" as const,
          accepted: true,
          externalRunId: null,
          message: "Rejeu idempotent detecte.",
        },
      };
    }
    hasClaim = claim.status === "claimed";
  }

  const startedAt = new Date().toISOString();
  const job = await createSocialImportJobRecord({
    status: "running",
    mode: "manual",
    environment,
    announcerScope: [announcerUid],
    counters: {
      rawFetched: 0,
      normalizedOk: 0,
      needsReview: 0,
      published: 0,
      rejected: 0,
    },
    triggeredBy: actorUid,
    startedAt,
    endedAt: null,
    metadata: {
        kind: "run",
        sourceId: source?.id ?? null,
        sourceUrl: source?.sourceUrl ?? null,
        sourceStatus: source?.status ?? null,
        executionMode: "local",
        allowLocalProd: true,
        reason: reason || null,
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
      limit: safeLimit,
      includeImported,
      headless,
    },
  });

  try {
    const dispatch = await dispatchSocialImportRun({
      jobId: job.id,
      announcerUid,
      sourceUrl: source?.sourceUrl ?? null,
      environment,
      limit: safeLimit,
      includeImported,
      headless,
      reason: reason || null,
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
      correlationId: input.correlationId,
      actorUid,
    });

    if (dispatch.externalRunId) {
      await patchSocialImportJobById({
        jobId: job.id,
        patch: {
          metadata: {
            kind: "run",
            sourceId: source?.id ?? null,
            sourceUrl: source?.sourceUrl ?? null,
            sourceStatus: source?.status ?? null,
            executionMode: "local",
            allowLocalProd: true,
            reason: reason || null,
            dateFrom: dateFrom ?? null,
            dateTo: dateTo ?? null,
            limit: safeLimit,
            includeImported,
            headless,
            externalRunId: dispatch.externalRunId,
          },
        },
      }).catch(() => undefined);
    }

    if (idempotencyKey && hasClaim) {
      await completeSocialImportIdempotency(idempotencyKey, input.correlationId, {
        jobId: job.id,
      });
    }

    return {
      job,
      replayed: false,
      dispatch,
    };
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_RUN_FAILED";

    await patchSocialImportJobById({
      jobId: job.id,
      patch: {
        status: "failed",
        endedAt: new Date().toISOString(),
        errorSummary: code,
      },
    }).catch(() => undefined);

    if (idempotencyKey && hasClaim) {
      await failSocialImportIdempotency(idempotencyKey, input.correlationId, code);
    }
    throw error;
  }
}

export async function importSocialPostsFromJson(input: {
  actorUid: string;
  announcerUid: string;
  posts: unknown[];
  sourceId?: string | null;
  environment?: SocialImportEnvironment;
  reason?: string | null;
  idempotencyKey?: string | null;
  correlationId: string;
}) {
  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const announcerUid = input.announcerUid.trim();
  if (!announcerUid) {
    throw new Error("SOCIAL_IMPORT_SOURCE_ANNOUNCER_UID_REQUIRED");
  }

  if (!Array.isArray(input.posts) || input.posts.length === 0) {
    throw new Error("SOCIAL_IMPORT_JSON_POSTS_REQUIRED");
  }

  const sourceId = input.sourceId?.trim() || null;
  const reason = (input.reason ?? "").trim();
  const environment = normalizeEnvironment(input.environment);

  const idempotencyKey = input.idempotencyKey?.trim() || null;
  const fingerprint = buildIdempotencyFingerprint("social_import.jobs.json_import", {
    announcerUid,
    sourceId,
    environment,
    reason,
    postsCount: input.posts.length,
    postKeys: input.posts
      .map((value) => {
        const post = asRecord(value);
        if (!post) return null;
        const pageId = toNullableString(post.page_id) ?? toNullableString(post.facebook_id) ?? "";
        const postId = toNullableString(post.post_id) ?? "";
        return `${pageId}:${postId}`;
      })
      .filter((item): item is string => Boolean(item))
      .sort(),
  });

  let hasClaim = false;
  if (idempotencyKey) {
    const claim = await claimSocialImportIdempotency({
      scope: "social_import.jobs.run",
      idempotencyKey,
      requestFingerprint: fingerprint,
      correlationId: input.correlationId,
      parseSummary: resolveDryRunSummary,
    });

    if (claim.status === "conflict") {
      throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT");
    }
    if (claim.status === "in_progress") {
      throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS");
    }
    if (claim.status === "replay") {
      const replayJob = await getSocialImportJobById(claim.summary.jobId);
      if (!replayJob) {
        throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_REPLAY_NOT_FOUND");
      }
      return {
        job: replayJob,
        replayed: true,
        importedCount: replayJob.counters.rawFetched,
      };
    }
    hasClaim = claim.status === "claimed";
  }

  const parsedCandidates = input.posts
    .map((rawItem, index) => {
      const post = asRecord(rawItem);
      if (!post) {
        return null;
      }

      const pageId =
        toNullableString(post.page_id) ||
        toNullableString(post.facebook_id) ||
        "unknown_page";
      const postId = toNullableString(post.post_id);
      const sourcePostUrl = toNullableString(post.post_url);
      const caption = toNullableString(post.caption);
      const title = extractTitleFromCaption(caption);
      const typeProperty = inferTypePropertyFromCaption(caption);
      const price = extractPriceFromCaption(caption);
      const city = inferCityFromCaption(caption);
      const province = inferProvinceFromCity(city);
      const sourcePublishedAt = toIsoFromCreationTime(post.creation_time);
      const thumbnailUrl = toNullableString(post.thumbnail_url);
      const mediaUrls = extractMediaUrls(post.media_urls);
      const imageUrls = Array.from(
        new Set([
          ...mediaUrls,
          ...(thumbnailUrl ? [thumbnailUrl] : []),
          ...toStringArray(post.media_urls),
        ]),
      );
      const safePostId = postId || `post_index_${index + 1}`;
      const rawPostId = `raw_fb_${pageId}_${safePostId}`.replace(/[^a-zA-Z0-9_-]/g, "_");

      return {
        rawPost: post,
        candidate: {
          id: rawPostId,
          announcerUid,
          sourceId: sourceId || `${pageId}_${safePostId}`,
          rawPostId,
          sourcePostUrl,
          title,
          typeProperty,
          price,
          city,
          province,
          imageUrls,
          status: "needs_review" as const,
          autoReason: "JSON_IMPORT_MANUAL_REVIEW_REQUIRED",
          score: 0.5,
          payload: {
            source: "json_manual_import",
            caption,
            pageId,
            pageName: toNullableString(post.page_name),
            postId: postId ?? safePostId,
            totalCommentCount: toNullableNumber(post.total_comment_count),
            shareCount: toNullableNumber(post.share_count),
            mediaUrlsCount: toNullableNumber(post.media_urls_count),
          },
          listing: null,
          metadata: {
            sourcePlatform: "facebook",
            sourceAuthorName: toNullableString(post.page_name),
            sourcePublishedAt,
            jsonImportedAt: new Date().toISOString(),
            sourceRecordType: "facebook_post_json",
            rawFacebookId: toNullableString(post.facebook_id),
            rawPageId: pageId,
            rawPostIdExternal: postId ?? safePostId,
          },
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (parsedCandidates.length === 0) {
    throw new Error("SOCIAL_IMPORT_JSON_POSTS_PARSE_EMPTY");
  }

  const nowIso = new Date().toISOString();
  const job = await createSocialImportJobRecord({
    status: "running",
    mode: "manual",
    environment,
    announcerScope: [announcerUid],
    counters: {
      rawFetched: 0,
      normalizedOk: 0,
      needsReview: 0,
      published: 0,
      rejected: 0,
    },
    triggeredBy: actorUid,
    startedAt: nowIso,
    endedAt: null,
    metadata: {
      kind: "json_import",
      sourceId,
      reason: reason || null,
      postsSubmittedCount: input.posts.length,
      candidatesParsedCount: parsedCandidates.length,
      executionMode: "local",
    },
  });

  try {
    const rawPostStorage = await writeSocialImportRawPostsToStorage({
      environment,
      jobId: job.id,
      announcerUid,
      records: parsedCandidates.map((item) => ({
        rawPostId: item.candidate.rawPostId,
        post: item.rawPost,
      })),
    });

    const rawPostStorageById = new Map(
      rawPostStorage.map((item) => [item.rawPostId, item] as const),
    );

    const reviewSync = await upsertSocialImportReviewCandidates({
      candidates: parsedCandidates.map((item) => {
        const storageRef = rawPostStorageById.get(item.candidate.rawPostId);
        return {
          ...item.candidate,
          jobId: job.id,
          metadata: {
            ...(item.candidate.metadata ?? {}),
            rawJsonPath: storageRef?.rawJsonPath ?? null,
            rawJsonBucket: storageRef?.rawJsonBucket ?? null,
            rawJsonGsUri: storageRef?.rawJsonGsUri ?? null,
            rawJsonSizeBytes: storageRef?.rawJsonSizeBytes ?? null,
          },
        };
      }),
    });

    const patchResult = await patchSocialImportJobById({
      jobId: job.id,
      patch: {
        status: "completed",
        endedAt: new Date().toISOString(),
        errorSummary: null,
        counters: {
          rawFetched: parsedCandidates.length,
          normalizedOk: reviewSync.readyToPublish,
          needsReview: reviewSync.needsReview,
          published: 0,
          rejected: reviewSync.rejected,
        },
        metadata: {
          ...(job.metadata ?? {}),
          importCompletedAt: new Date().toISOString(),
          rawPostsStoredCount: rawPostStorage.length,
        },
      },
    });

    if (!patchResult) {
      throw new Error("SOCIAL_IMPORT_JOB_RESULT_PATCH_FAILED");
    }

    if (idempotencyKey && hasClaim) {
      await completeSocialImportIdempotency(idempotencyKey, input.correlationId, {
        jobId: job.id,
      });
    }

    return {
      job: patchResult.after,
      replayed: false,
      importedCount: parsedCandidates.length,
      reviewSync,
    };
  } catch (error) {
    await patchSocialImportJobById({
      jobId: job.id,
      patch: {
        status: "failed",
        endedAt: new Date().toISOString(),
        errorSummary:
          error instanceof Error ? error.message : "SOCIAL_IMPORT_JSON_IMPORT_FAILED",
      },
    }).catch(() => undefined);

    if (idempotencyKey && hasClaim) {
      const code =
        error instanceof Error ? error.message : "SOCIAL_IMPORT_JSON_IMPORT_FAILED";
      await failSocialImportIdempotency(idempotencyKey, input.correlationId, code);
    }
    throw error;
  }
}

export async function triggerSocialImportDryRun(input: {
  actorUid: string;
  sourceIds?: string[] | null;
  announcerUids?: string[] | null;
  environment?: SocialImportEnvironment;
  reason?: string | null;
  idempotencyKey?: string | null;
  correlationId: string;
}) {
  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const sourceIds = uniqueStrings(normalizeStringList(input.sourceIds));
  const announcerUids = uniqueStrings(normalizeStringList(input.announcerUids));
  const environment = normalizeEnvironment(input.environment);
  if (environment === "prod") {
    throw new Error("SOCIAL_IMPORT_DRY_RUN_ENVIRONMENT_FORBIDDEN");
  }

  const reason = (input.reason ?? "").trim();
  const sourceRecords: SocialImportSource[] = [];
  for (const sourceId of sourceIds) {
    const source = await getSocialImportSourceById(sourceId);
    if (!source) {
      throw new Error("SOCIAL_IMPORT_SOURCE_NOT_FOUND");
    }
    sourceRecords.push(source);
  }

  const announcerScope = uniqueStrings([
    ...announcerUids,
    ...sourceRecords.map((source) => source.announcerUid),
  ]);
  if (announcerScope.length === 0) {
    throw new Error("SOCIAL_IMPORT_DRY_RUN_SCOPE_REQUIRED");
  }

  const idempotencyKey = input.idempotencyKey?.trim() || null;
  const fingerprint = buildIdempotencyFingerprint("social_import.jobs.dry_run", {
    announcerScope: [...announcerScope].sort(),
    sourceIds: [...sourceIds].sort(),
    environment,
    reason,
  });

  let hasClaim = false;
  if (idempotencyKey) {
    const claim = await claimSocialImportIdempotency({
      scope: "social_import.jobs.dry_run",
      idempotencyKey,
      requestFingerprint: fingerprint,
      correlationId: input.correlationId,
      parseSummary: resolveDryRunSummary,
    });

    if (claim.status === "conflict") {
      throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT");
    }
    if (claim.status === "in_progress") {
      throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS");
    }
    if (claim.status === "replay") {
      const replayJob = await getSocialImportJobById(claim.summary.jobId);
      if (!replayJob) {
        throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_REPLAY_NOT_FOUND");
      }
      return {
        job: replayJob,
        replayed: true,
      };
    }
    hasClaim = claim.status === "claimed";
  }

  try {
    const nowIso = new Date().toISOString();
    const job = await createSocialImportJobRecord({
      status: "completed",
      mode: "manual",
      environment,
      announcerScope,
      counters: {
        rawFetched: 0,
        normalizedOk: 0,
        needsReview: 0,
        published: 0,
        rejected: 0,
      },
      triggeredBy: actorUid,
      startedAt: nowIso,
      endedAt: nowIso,
      metadata: {
        kind: "dry_run",
        reason: reason || null,
        sourceIds,
        executionMode: "local",
      },
    });

    if (idempotencyKey && hasClaim) {
      await completeSocialImportIdempotency(idempotencyKey, input.correlationId, {
        jobId: job.id,
      });
    }

    return {
      job,
      replayed: false,
    };
  } catch (error) {
    if (idempotencyKey && hasClaim) {
      const code =
        error instanceof Error ? error.message : "SOCIAL_IMPORT_DRY_RUN_FAILED";
      await failSocialImportIdempotency(idempotencyKey, input.correlationId, code);
    }
    throw error;
  }
}

export async function retrySocialImportJob(input: {
  jobId: string;
  actorUid: string;
  reason?: string | null;
  idempotencyKey: string;
  correlationId: string;
}) {
  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const jobId = input.jobId.trim();
  if (!jobId) {
    throw new Error("SOCIAL_IMPORT_JOB_ID_INVALID");
  }

  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey) {
    throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_KEY_REQUIRED");
  }

  const reason = (input.reason ?? "").trim();
  const previousJob = await getSocialImportJobById(jobId);
  if (!previousJob) {
    throw new Error("SOCIAL_IMPORT_JOB_NOT_FOUND");
  }

  if (!resolveAllowedRetryStatus(previousJob.status)) {
    throw new Error("SOCIAL_IMPORT_JOB_RETRY_STATUS_INVALID");
  }

  const claim = await claimSocialImportIdempotency({
    scope: "social_import.jobs.retry",
    idempotencyKey,
    requestFingerprint: buildIdempotencyFingerprint("social_import.jobs.retry", {
      retryOf: jobId,
      actorUid,
      reason,
      previousStatus: previousJob.status,
    }),
    correlationId: input.correlationId,
    parseSummary: resolveDryRunSummary,
  });

  if (claim.status === "conflict") {
    throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT");
  }

  if (claim.status === "in_progress") {
    throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS");
  }

  if (claim.status === "replay") {
    const replayJob = await getSocialImportJobById(claim.summary.jobId);
    if (!replayJob) {
      throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_REPLAY_NOT_FOUND");
    }
    return {
      previousJob,
      job: replayJob,
      replayed: true,
    };
  }

  try {
    const nowIso = new Date().toISOString();
    const retryJob = await createSocialImportJobRecord({
      status: "completed",
      mode: previousJob.mode,
      environment: previousJob.environment,
      announcerScope: previousJob.announcerScope,
      counters: {
        rawFetched: 0,
        normalizedOk: 0,
        needsReview: 0,
        published: 0,
        rejected: 0,
      },
      triggeredBy: actorUid,
      startedAt: nowIso,
      endedAt: nowIso,
      metadata: {
        kind: "retry",
        retryOf: previousJob.id,
        previousStatus: previousJob.status,
        reason: reason || null,
        executionMode: "local",
      },
    });

    await createSocialImportDecisionRecord({
      jobId: retryJob.id,
      decision: "retry",
      reason: reason || `Retry job ${previousJob.id}`,
      actorId: actorUid,
      metadata: {
        retryOf: previousJob.id,
        previousStatus: previousJob.status,
      },
    });

    await completeSocialImportIdempotency(idempotencyKey, input.correlationId, {
      jobId: retryJob.id,
    });

    return {
      previousJob,
      job: retryJob,
      replayed: false,
    };
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_JOB_RETRY_FAILED";
    await failSocialImportIdempotency(idempotencyKey, input.correlationId, code);
    throw error;
  }
}

export async function rejectSocialImportCandidate(input: {
  candidateId: string;
  reason: string;
  actorUid: string;
}) {
  const candidateId = input.candidateId.trim();
  if (!candidateId) {
    throw new Error("SOCIAL_IMPORT_CANDIDATE_ID_INVALID");
  }

  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw new Error("SOCIAL_IMPORT_REJECTION_REASON_REQUIRED");
  }

  const candidate = await getSocialImportReviewCandidateById(candidateId);
  if (!candidate) {
    return null;
  }

  const mutation = await patchSocialImportReviewCandidateById({
    candidateId,
    patch: {
      status: "rejected",
      reviewedBy: actorUid,
      reviewedAt: new Date().toISOString(),
      reviewReason: reason,
    },
  });

  if (!mutation) {
    return null;
  }

  await createSocialImportDecisionRecord({
    jobId: mutation.after.jobId,
    announcerUid: mutation.after.announcerUid,
    rawPostId: mutation.after.rawPostId,
    decision: "reject",
    reason,
    actorId: actorUid,
    metadata: {
      candidateId: mutation.after.id,
      previousStatus: mutation.before.status,
      newStatus: mutation.after.status,
    },
  });

  return mutation;
}

function resolvePublishSummary(
  value: unknown,
): { candidateId: string; propertyId: string | null } | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidateId =
    "candidateId" in value && typeof value.candidateId === "string"
      ? value.candidateId.trim()
      : "";
  const propertyId =
    "propertyId" in value && typeof value.propertyId === "string"
      ? value.propertyId.trim()
      : "";
  return candidateId ? { candidateId, propertyId: propertyId || null } : null;
}

export async function publishSocialImportCandidate(input: {
  candidateId: string;
  actorUid: string;
  reason?: string | null;
  idempotencyKey: string;
  correlationId: string;
}) {
  const candidateId = input.candidateId.trim();
  if (!candidateId) {
    throw new Error("SOCIAL_IMPORT_CANDIDATE_ID_INVALID");
  }

  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey) {
    throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_KEY_REQUIRED");
  }

  const reason = (input.reason ?? "").trim();
  const candidateRaw = await getSocialImportReviewCandidateRawById(candidateId);
  if (!candidateRaw) {
    return null;
  }
  const candidate = candidateRaw.candidate;

  if (candidate.status === "rejected") {
    throw new Error("SOCIAL_IMPORT_CANDIDATE_REJECTED");
  }

  if (candidate.status === "published") {
    throw new Error("SOCIAL_IMPORT_CANDIDATE_ALREADY_PUBLISHED");
  }

  if (candidate.status !== "ready_to_publish") {
    throw new Error("SOCIAL_IMPORT_CANDIDATE_NOT_READY_TO_PUBLISH");
  }

  const claim = await claimSocialImportIdempotency({
    scope: "social_import.review.publish",
    idempotencyKey,
    requestFingerprint: buildIdempotencyFingerprint(
      "social_import.review.publish",
      {
        candidateId,
        actorUid,
        reason,
      },
    ),
    correlationId: input.correlationId,
    parseSummary: resolvePublishSummary,
  });

  if (claim.status === "conflict") {
    throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_CONFLICT");
  }

  if (claim.status === "in_progress") {
    throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_IN_PROGRESS");
  }

  if (claim.status === "replay") {
    const replayCandidate = await getSocialImportReviewCandidateById(
      claim.summary.candidateId,
    );
    if (!replayCandidate) {
      throw new Error("SOCIAL_IMPORT_IDEMPOTENCY_REPLAY_NOT_FOUND");
    }
    return {
      candidate: replayCandidate,
      propertyId: claim.summary.propertyId,
      replayed: true,
    };
  }

  try {
    const createListingInput = normalizeCreateListingInputFromCandidate({
      announcerUid: candidate.announcerUid,
      rawData: candidateRaw.rawData,
    });

    const createdListing = await createListingForAnnouncer(createListingInput);
    const mutation = await patchSocialImportReviewCandidateById({
      candidateId,
      patch: {
        status: "published",
        reviewedBy: actorUid,
        reviewedAt: new Date().toISOString(),
        reviewReason: reason || "Publication validée depuis le dashboard admin.",
        publishedPropertyId: createdListing.propertyId,
        publicationMetadata: {
          propertyId: createdListing.propertyId,
          publishedAt: new Date().toISOString(),
          publishedBy: actorUid,
        },
      },
    });

    if (!mutation) {
      return null;
    }

    await createSocialImportDecisionRecord({
      jobId: mutation.after.jobId,
      announcerUid: mutation.after.announcerUid,
      rawPostId: mutation.after.rawPostId,
      decision: "publish",
      reason: reason || "Publication validée.",
      actorId: actorUid,
      metadata: {
        candidateId: mutation.after.id,
        sourceId: mutation.after.sourceId,
        propertyId: createdListing.propertyId,
      },
    });

    await completeSocialImportIdempotency(idempotencyKey, input.correlationId, {
      candidateId: mutation.after.id,
      propertyId: createdListing.propertyId,
    });

    return {
      candidate: mutation.after,
      propertyId: createdListing.propertyId,
      replayed: false,
    };
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "SOCIAL_IMPORT_CANDIDATE_PUBLISH_FAILED";
    await failSocialImportIdempotency(idempotencyKey, input.correlationId, code);
    throw error;
  }
}
