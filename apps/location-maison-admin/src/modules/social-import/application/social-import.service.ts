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
const SOCIAL_IMPORT_CLOUD_RUN_REGION =
  process.env.SOCIAL_IMPORT_CLOUD_RUN_REGION?.trim() || "europe-west1";
const SOCIAL_IMPORT_CLOUD_RUN_JOB_NAME =
  process.env.SOCIAL_IMPORT_CLOUD_RUN_JOB_NAME?.trim() || "social-import-scraper-job";

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

function normalizeExecutionMode(
  value?: string | null,
): SocialImportSettings["orchestrator"]["executionMode"] {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "local" || normalized === "orchestrator") {
    return normalized;
  }
  return "auto";
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
  const executionMode = normalizeExecutionMode(
    process.env.SOCIAL_IMPORT_EXECUTION_MODE,
  );
  const hasOrchestratorUrl = Boolean(
    process.env.SOCIAL_IMPORT_ORCHESTRATOR_URL?.trim(),
  );
  const allowLocalProd = String(
    process.env.SOCIAL_IMPORT_ALLOW_LOCAL_PROD ?? "",
  )
    .trim()
    .toLowerCase();

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
      executionMode,
      orchestratorUrlConfigured: hasOrchestratorUrl,
      allowLocalProd:
        allowLocalProd === "1" ||
        allowLocalProd === "true" ||
        allowLocalProd === "yes",
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

function resolveSocialImportProjectId() {
  return (
    process.env.GCP_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    null
  );
}

function resolveExternalExecutionName(job: SocialImportJob) {
  const externalRunIdRaw = job.metadata?.externalRunId;
  if (typeof externalRunIdRaw !== "string") {
    return null;
  }
  const trimmed = externalRunIdRaw.trim();
  if (!trimmed) {
    return null;
  }
  const segments = trimmed.split("/").filter((segment) => segment.trim().length > 0);
  return segments.length ? segments[segments.length - 1] : trimmed;
}

function resolveCloudRunLogsUrl(input: {
  projectId: string;
  region: string;
  jobName: string;
  executionName: string | null;
}) {
  const queryParts = [
    'resource.type="cloud_run_job"',
    `resource.labels.job_name="${input.jobName}"`,
    `resource.labels.location="${input.region}"`,
  ];
  if (input.executionName) {
    queryParts.push(`resource.labels.execution_name="${input.executionName}"`);
  }
  const query = queryParts.join("\n");
  const encodedQuery = encodeURIComponent(query);
  return `https://console.cloud.google.com/logs/query;query=${encodedQuery}?project=${encodeURIComponent(input.projectId)}`;
}

function resolveCloudRunExecutionsUrl(input: {
  projectId: string;
  region: string;
  jobName: string;
}) {
  return `https://console.cloud.google.com/run/jobs/details/${encodeURIComponent(input.region)}/${encodeURIComponent(input.jobName)}/executions?project=${encodeURIComponent(input.projectId)}`;
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

  const projectId = resolveSocialImportProjectId();
  const executionName = resolveExternalExecutionName(job);
  const orchestratorUrl = process.env.SOCIAL_IMPORT_ORCHESTRATOR_URL?.trim() || null;

  const hints: string[] = [];
  if (job.status === "running") {
    hints.push("Le job est encore en cours: surveille les logs Cloud Run.");
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

  const cloudRun = projectId
    ? {
        projectId,
        region: SOCIAL_IMPORT_CLOUD_RUN_REGION,
        jobName: SOCIAL_IMPORT_CLOUD_RUN_JOB_NAME,
        executionName,
        executionsUrl: resolveCloudRunExecutionsUrl({
          projectId,
          region: SOCIAL_IMPORT_CLOUD_RUN_REGION,
          jobName: SOCIAL_IMPORT_CLOUD_RUN_JOB_NAME,
        }),
        logsUrl: resolveCloudRunLogsUrl({
          projectId,
          region: SOCIAL_IMPORT_CLOUD_RUN_REGION,
          jobName: SOCIAL_IMPORT_CLOUD_RUN_JOB_NAME,
          executionName,
        }),
      }
    : null;

  return {
    job,
    logs: {
      cloudRun,
      orchestratorUrl,
      externalRunId:
        typeof job.metadata?.externalRunId === "string"
          ? job.metadata.externalRunId
          : null,
      hints,
    },
  };
}

async function tryCancelOrchestratorRun(input: {
  runId: string | null;
  correlationId: string;
}) {
  const orchestratorBaseUrl = process.env.SOCIAL_IMPORT_ORCHESTRATOR_URL?.trim();
  const runId = input.runId?.trim() || "";
  if (!orchestratorBaseUrl || !runId) {
    return {
      attempted: false,
      accepted: false,
      message: null as string | null,
    };
  }

  const cancelUrl = `${orchestratorBaseUrl.replace(/\/+$/, "")}/cancel`;
  const token = process.env.SOCIAL_IMPORT_ORCHESTRATOR_TOKEN?.trim();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-correlation-id": input.correlationId,
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(cancelUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ runId }),
    });
    if (!response.ok) {
      return {
        attempted: true,
        accepted: false,
        message: `HTTP_${response.status}`,
      };
    }
    return {
      attempted: true,
      accepted: true,
      message: "accepted",
    };
  } catch (error) {
    return {
      attempted: true,
      accepted: false,
      message: error instanceof Error ? error.message : "REQUEST_FAILED",
    };
  }
}

export async function cancelSocialImportJob(input: {
  jobId: string;
  actorUid: string;
  reason?: string | null;
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

  const reason = (input.reason ?? "").trim();
  const job = await getSocialImportJobById(jobId);
  if (!job) {
    throw new Error("SOCIAL_IMPORT_JOB_NOT_FOUND");
  }

  if (job.status !== "running") {
    throw new Error("SOCIAL_IMPORT_JOB_CANCEL_STATUS_INVALID");
  }

  const externalRunId =
    typeof job.metadata?.externalRunId === "string" ? job.metadata.externalRunId : null;
  const orchestratorCancel = await tryCancelOrchestratorRun({
    runId: externalRunId,
    correlationId: input.correlationId,
  });

  const endedAt = new Date().toISOString();
  const cancellationReason = reason || "Annulation demandée depuis dashboard admin.";
  const errorSummary = [
    "SOCIAL_IMPORT_CANCELLED_BY_ADMIN",
    `reason=${cancellationReason}`,
    orchestratorCancel.attempted
      ? `orchestratorCancel=${orchestratorCancel.accepted ? "accepted" : "not_confirmed"}`
      : "orchestratorCancel=not_attempted",
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
        orchestratorCancel,
      },
    },
  });

  if (!patchResult) {
    throw new Error("SOCIAL_IMPORT_JOB_CANCEL_PATCH_FAILED");
  }

  return {
    before: patchResult.before,
    after: patchResult.after,
    orchestratorCancel,
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
      orchestratorUrlConfigured: Boolean(
        process.env.SOCIAL_IMPORT_ORCHESTRATOR_URL?.trim(),
      ),
      executionMode: normalizeExecutionMode(
        stored.orchestrator.executionMode ||
          process.env.SOCIAL_IMPORT_EXECUTION_MODE ||
          defaults.orchestrator.executionMode,
      ),
      allowLocalProd: stored.orchestrator.allowLocalProd,
    },
  };
}

export async function updateSocialImportSettings(input: {
  actorUid: string;
  patch: Partial<{
    thresholds: Partial<SocialImportSettings["thresholds"]>;
    scheduler: Partial<SocialImportSettings["scheduler"]>;
    orchestrator: Partial<SocialImportSettings["orchestrator"]>;
  }>;
}) {
  const actorUid = input.actorUid.trim();
  if (!actorUid) {
    throw new Error("SOCIAL_IMPORT_ACTOR_UID_REQUIRED");
  }

  const hasPatch =
    Boolean(input.patch.thresholds) ||
    Boolean(input.patch.scheduler) ||
    Boolean(input.patch.orchestrator);
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

  const orchestratorPatch = input.patch.orchestrator ?? {};
  if (
    orchestratorPatch.executionMode !== undefined &&
    !["auto", "orchestrator", "local"].includes(
      String(orchestratorPatch.executionMode),
    )
  ) {
    throw new Error("SOCIAL_IMPORT_ORCHESTRATOR_MODE_INVALID");
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
      orchestrator:
        orchestratorPatch.executionMode !== undefined
          ? {
              ...orchestratorPatch,
              executionMode: normalizeExecutionMode(
                orchestratorPatch.executionMode,
              ),
            }
          : orchestratorPatch,
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
  if (environment === "prod" && !reason) {
    throw new Error("SOCIAL_IMPORT_REASON_REQUIRED");
  }

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
  const includeImported = input.includeImported === null ? true : Boolean(input.includeImported ?? true);
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
        executionMode: settings.orchestrator.executionMode,
        allowLocalProd: settings.orchestrator.allowLocalProd,
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
      environment,
      executionMode: settings.orchestrator.executionMode,
      allowLocalProd: settings.orchestrator.allowLocalProd,
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
            executionMode: settings.orchestrator.executionMode,
            allowLocalProd: settings.orchestrator.allowLocalProd,
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
        orchestrator: "si2_stub",
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
        orchestrator: "si2_stub",
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
