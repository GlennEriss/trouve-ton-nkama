import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  patchSocialImportJobById,
  upsertSocialImportReviewCandidates,
} from "@/modules/social-import/infrastructure/social-import.repository";

export type SocialImportRunDispatchInput = {
  jobId: string;
  announcerUid: string;
  sourceUrl: string | null;
  environment: "dev" | "preprod" | "prod";
  limit: number;
  includeImported: boolean;
  headless: boolean;
  reason: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  correlationId: string;
  actorUid: string;
};

export type SocialImportRunDispatchResult = {
  mode: "local_command";
  accepted: boolean;
  externalRunId: string | null;
  message: string | null;
};

type PipelineSummaryPayload = {
  paths?: {
    readyDir?: unknown;
    rawDir?: unknown;
  };
  stats?: {
    events?: unknown;
  };
};

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toIsoOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function toImageUrls(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }
  const urls: string[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed) {
        urls.push(trimmed);
      }
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const fileURL = String((item as { fileURL?: unknown }).fileURL ?? "").trim();
      if (fileURL) {
        urls.push(fileURL);
      }
    }
  }
  return Array.from(new Set(urls));
}

function toRawImageUrls(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }
  const urls: string[] = [];
  for (const item of input) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const originalUrl = toTrimmedString(record.originalUrl);
    const storedPath = toTrimmedString(record.storedPath);
    if (originalUrl) {
      urls.push(originalUrl);
      continue;
    }
    if (storedPath) {
      urls.push(storedPath);
    }
  }
  return urls;
}

function hasListingCoreFields(listing: Record<string, unknown> | null) {
  if (!listing) {
    return false;
  }
  const title = String(listing.title ?? "").trim();
  const description = String(listing.description ?? "").trim();
  const typeProperty = String(listing.typeProperty ?? "").trim();
  const status = String(listing.status ?? "").trim();
  return Boolean(title && description && typeProperty && status);
}

function resolveRawDir(summary: PipelineSummaryPayload, scraperRoot: string) {
  const rawDirRaw = summary.paths?.rawDir;
  if (typeof rawDirRaw === "string" && rawDirRaw.trim()) {
    const value = rawDirRaw.trim();
    return path.isAbsolute(value) ? value : path.resolve(scraperRoot, value);
  }
  return path.resolve(scraperRoot, "storage/raw/posts");
}

function resolveReadyDir(summary: PipelineSummaryPayload, scraperRoot: string) {
  const readyDirRaw = summary.paths?.readyDir;
  if (typeof readyDirRaw === "string" && readyDirRaw.trim()) {
    const value = readyDirRaw.trim();
    return path.isAbsolute(value) ? value : path.resolve(scraperRoot, value);
  }
  return path.resolve(
    scraperRoot,
    "storage/exports/location-maison-fine-tuning/annonces/ready-with-images/by-raw-post",
  );
}

function extractRawPostIds(summary: PipelineSummaryPayload) {
  const events = Array.isArray(summary.stats?.events) ? summary.stats?.events : [];
  const rawPostIds: string[] = [];
  for (const event of events) {
    const record = asRecord(event);
    if (!record) {
      continue;
    }
    const type = String(record.type ?? "").trim().toUpperCase();
    const rawPostId = String(record.rawPostId ?? "").trim();
    if (type === "RAW_SAVED" && rawPostId) {
      rawPostIds.push(rawPostId);
    }
  }
  return Array.from(new Set(rawPostIds));
}

async function syncReviewCandidatesFromSummary(input: {
  summaryPath: string | null;
  scraperRoot: string;
  jobId: string;
  announcerUid: string;
}) {
  if (!input.summaryPath) {
    return null;
  }

  try {
    const summaryRaw = await readFile(input.summaryPath, "utf8");
    const summary = JSON.parse(summaryRaw) as PipelineSummaryPayload;
    const readyDir = resolveReadyDir(summary, input.scraperRoot);
    const rawDir = resolveRawDir(summary, input.scraperRoot);
    const rawPostIds = extractRawPostIds(summary);
    if (rawPostIds.length === 0) {
      return {
        upserted: 0,
        created: 0,
        updated: 0,
        readyToPublish: 0,
        needsReview: 0,
        rejected: 0,
      };
    }

    const candidates: Array<{
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
      status: "ready_to_publish" | "needs_review" | "rejected" | "published";
      autoReason?: string | null;
      score?: number | null;
      payload?: Record<string, unknown> | null;
      listing?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    }> = [];

    for (const rawPostId of rawPostIds) {
      const readyPath = path.join(readyDir, `${rawPostId}.annonce.json`);
      let hasReadyFile = false;
      try {
        await access(readyPath);
        hasReadyFile = true;
      } catch {
        hasReadyFile = false;
      }

      if (hasReadyFile) {
        try {
          const readyRaw = await readFile(readyPath, "utf8");
          const readyJson = JSON.parse(readyRaw) as Record<string, unknown>;
          const source = asRecord(readyJson.source);
          const listing = asRecord(readyJson.annonce);
          const imageUrls = toImageUrls(
            Array.isArray(listing?.images) ? listing?.images : [],
          );
          const modelRejectReason = String(readyJson.modelRejectReason ?? "").trim();
          const status =
            hasListingCoreFields(listing) && !modelRejectReason
              ? "ready_to_publish"
              : "needs_review";
          const autoReason =
            modelRejectReason ||
            (status === "needs_review" ? "LISTING_REQUIERT_VALIDATION_MANUELLE" : null);
          const score =
            status === "ready_to_publish" ? 0.9 : modelRejectReason ? 0.35 : 0.45;

          candidates.push({
            id: rawPostId,
            jobId: input.jobId,
            announcerUid:
              String(source?.advertiser_uuid ?? "").trim() || input.announcerUid,
            sourceId: String(listing?.sourceId ?? rawPostId).trim() || rawPostId,
            rawPostId,
            sourcePostUrl:
              String(source?.sourcePostUrl ?? "").trim() || null,
            title: String(listing?.title ?? "").trim() || null,
            typeProperty: String(listing?.typeProperty ?? "").trim() || null,
            price:
              typeof listing?.price === "number" && Number.isFinite(listing.price)
                ? listing.price
                : null,
            city: String(listing?.city ?? "").trim() || null,
            province: String(listing?.province ?? "").trim() || null,
            imageUrls,
            status,
            autoReason,
            score,
            payload: listing ? { listing } : null,
            listing,
            metadata: {
              sourcePlatform: String(source?.sourcePlatform ?? "").trim() || null,
              sourceAuthorName: String(source?.sourceAuthorName ?? "").trim() || null,
              sourcePublishedAt: toIsoOrNull(source?.sourcePublishedAt),
              generatedAt: toIsoOrNull(readyJson.generatedAt),
              readyPath,
              imageCountLinked:
                typeof readyJson.imageCountLinked === "number" &&
                Number.isFinite(readyJson.imageCountLinked)
                  ? readyJson.imageCountLinked
                  : imageUrls.length,
              modelJobId: String(readyJson.modelJobId ?? "").trim() || null,
              modelRecordSource:
                String(readyJson.modelRecordSource ?? "").trim() || null,
            },
          });
          continue;
        } catch {
          // fallback vers raw
        }
      }

      const rawPath = path.join(rawDir, `${rawPostId}.json`);
      try {
        await access(rawPath);
      } catch {
        continue;
      }

      try {
        const rawPayload = await readFile(rawPath, "utf8");
        const rawJson = JSON.parse(rawPayload) as Record<string, unknown>;
        const rawDescription = toTrimmedString(rawJson.rawDescription);
        const descriptionPreview = rawDescription
          ? rawDescription.replace(/\s+/g, " ").trim().slice(0, 180)
          : "";
        const titleFromSource = toTrimmedString(rawJson.sourceAuthorName);
        const imageUrls = Array.from(
          new Set([
            ...toRawImageUrls(rawJson.images),
            ...toImageUrls(rawJson.rawImageUrls),
            ...toImageUrls(rawJson.rawImageUrlsFromSource),
          ]),
        );

        candidates.push({
          id: rawPostId,
          jobId: input.jobId,
          announcerUid:
            toTrimmedString(rawJson.advertiser_uuid) || input.announcerUid,
          sourceId: rawPostId,
          rawPostId,
          sourcePostUrl: toTrimmedString(rawJson.sourcePostUrl) || null,
          title:
            titleFromSource ||
            (descriptionPreview
              ? `${descriptionPreview}${rawDescription.length > 180 ? "..." : ""}`
              : null),
          typeProperty: null,
          price: null,
          city: null,
          province: null,
          imageUrls,
          status: "needs_review",
          autoReason: "RAW_SCRAP_SANS_FORMAT_READY",
          score: 0.25,
          payload: {
            sourcePlatform: toTrimmedString(rawJson.sourcePlatform) || "facebook",
            rawDescription: descriptionPreview || null,
            imageCount: imageUrls.length,
            status: toTrimmedString(rawJson.status) || null,
          },
          listing: null,
          metadata: {
            sourcePlatform: toTrimmedString(rawJson.sourcePlatform) || null,
            sourceAuthorName: titleFromSource || null,
            sourcePublishedAt: toIsoOrNull(rawJson.sourcePublishedAt),
            generatedAt: null,
            readyPath: null,
            rawPath,
            imageCountLinked: imageUrls.length,
            modelJobId: null,
            modelRecordSource: "raw_fallback",
          },
        });
      } catch {
        continue;
      }
    }

    if (candidates.length === 0) {
      return {
        upserted: 0,
        created: 0,
        updated: 0,
        readyToPublish: 0,
        needsReview: 0,
        rejected: 0,
      };
    }

    return upsertSocialImportReviewCandidates({ candidates });
  } catch {
    return null;
  }
}

function splitLinesWithRemainder(input: string) {
  const lines = input.split(/\r?\n/);
  const remainder = lines.pop() ?? "";
  return { lines, remainder };
}

function resolveSummaryPathFromLine(line: string) {
  const summaryLine = line.match(/^- summary:\s+(.+)$/i);
  if (summaryLine?.[1]) {
    return summaryLine[1].trim();
  }

  const structuredLine = line.match(/\bsummaryPath=([^\s]+)\b/i);
  if (structuredLine?.[1]) {
    return structuredLine[1].trim();
  }

  return null;
}

async function readPipelineCounters(summaryPath: string | null) {
  if (!summaryPath) {
    return null;
  }

  try {
    const payloadRaw = await readFile(summaryPath, "utf8");
    const payload = JSON.parse(payloadRaw) as {
      stats?: {
        discoveredRawCount?: unknown;
        formatSuccessCount?: unknown;
        formatNoOutputCount?: unknown;
        formatFailedCount?: unknown;
      };
    };

    const stats = payload.stats ?? {};
    const toSafe = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : 0;

    return {
      rawFetched: toSafe(stats.discoveredRawCount),
      normalizedOk: toSafe(stats.formatSuccessCount),
      needsReview: toSafe(stats.formatNoOutputCount),
      published: 0,
      rejected: toSafe(stats.formatFailedCount),
    };
  } catch {
    return null;
  }
}

async function dispatchViaLocalCommand(
  input: SocialImportRunDispatchInput,
): Promise<SocialImportRunDispatchResult> {
  const scraperRoot =
    process.env.SOCIAL_IMPORT_SCRAPER_ROOT?.trim() ||
    path.resolve(process.cwd(), "../location-maison-scrap");

  try {
    await access(scraperRoot);
  } catch {
    throw new Error("SOCIAL_IMPORT_SCRAPER_ROOT_NOT_FOUND");
  }

  const args = [
    "run",
    "pipeline:run",
    "--",
    `--advertiser-uuid=${input.announcerUid}`,
    `--limit=${input.limit}`,
    `--include-imported=${String(input.includeImported)}`,
    `--headless=${String(input.headless)}`,
  ];
  if (input.dateFrom) {
    args.push(`--date-from=${input.dateFrom}`);
  }
  if (input.dateTo) {
    args.push(`--date-to=${input.dateTo}`);
  }
  if (input.sourceUrl) {
    args.push(`--force-url=${input.sourceUrl}`);
  }

  const child = spawn("npm", args, {
    cwd: scraperRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  let stdoutBuffer = "";
  let stderrTail = "";
  let summaryPath: string | null = null;

  child.stdout.on("data", (chunk) => {
    stdoutBuffer += String(chunk ?? "");
    const { lines, remainder } = splitLinesWithRemainder(stdoutBuffer);
    stdoutBuffer = remainder;
    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) {
        continue;
      }
      const discovered = resolveSummaryPathFromLine(line);
      if (discovered) {
        summaryPath = discovered;
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    stderrTail = `${stderrTail}${String(chunk ?? "")}`;
    if (stderrTail.length > 8_000) {
      stderrTail = stderrTail.slice(-8_000);
    }
  });

  child.on("error", async () => {
    await patchSocialImportJobById({
      jobId: input.jobId,
      patch: {
        status: "failed",
        endedAt: new Date().toISOString(),
        errorSummary: "SOCIAL_IMPORT_LOCAL_DISPATCH_ERROR",
      },
    }).catch(() => undefined);
  });

  child.on("exit", async (code, signal) => {
    const endedAt = new Date().toISOString();
    if (code === 0) {
      const counters = await readPipelineCounters(summaryPath);
      const reviewSync = await syncReviewCandidatesFromSummary({
        summaryPath,
        scraperRoot,
        jobId: input.jobId,
        announcerUid: input.announcerUid,
      });

      const mergedCounters = counters
        ? {
            ...counters,
            needsReview:
              reviewSync && Number.isFinite(reviewSync.needsReview)
                ? reviewSync.needsReview
                : counters.needsReview,
          }
        : undefined;

      await patchSocialImportJobById({
        jobId: input.jobId,
        patch: {
          status: "completed",
          endedAt,
          errorSummary: null,
          counters: mergedCounters ?? undefined,
        },
      }).catch(() => undefined);
      return;
    }

    const errorSummary = [
      "SOCIAL_IMPORT_LOCAL_RUN_FAILED",
      `exitCode=${String(code ?? "null")}`,
      `signal=${String(signal ?? "null")}`,
      stderrTail.trim().slice(-600),
    ]
      .filter((part) => part.length > 0)
      .join(" | ");

    await patchSocialImportJobById({
      jobId: input.jobId,
      patch: {
        status: "failed",
        endedAt,
        errorSummary,
      },
    }).catch(() => undefined);
  });

  return {
    mode: "local_command",
    accepted: true,
    externalRunId: child.pid ? String(child.pid) : null,
    message:
      "Pipeline local declenche. Le job sera mis a jour automatiquement a la fin.",
  };
}

export async function dispatchSocialImportRun(
  input: SocialImportRunDispatchInput,
): Promise<SocialImportRunDispatchResult> {
  return dispatchViaLocalCommand(input);
}
