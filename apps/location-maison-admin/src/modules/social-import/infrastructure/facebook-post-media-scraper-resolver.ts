import { spawn } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = Number(
  process.env.SOCIAL_IMPORT_LOCAL_SCRAPER_TIMEOUT_MS ?? 180000,
);
const DEFAULT_HEADLESS = String(
  process.env.SOCIAL_IMPORT_LOCAL_SCRAPER_HEADLESS ?? "true",
).toLowerCase() !== "false";

type ResolveOriginalFacebookPostMediaFromLocalScraperInput = {
  postUrl: string;
  announcerUid: string;
  fallbackUrls: string[];
  timeoutMs?: number;
  headless?: boolean;
};

export type ResolveOriginalFacebookPostMediaFromLocalScraperResult = {
  imageUrls: string[];
  usedFallback: boolean;
  details: {
    sourcePostUrl: string;
    normalizedPostUrl: string;
    scraperRoot: string | null;
    commandExecuted: boolean;
    commandExitCode: number | null;
    commandTimedOut: boolean;
    jobId: string | null;
    jobFilePath: string | null;
    jobReportedImageCount: number;
    rawPostId: string | null;
    resolvedImageCount: number;
    errorCode: string | null;
    stderrTail: string | null;
  };
};

type ScraperJobPost = {
  url?: unknown;
  rawPostId?: unknown;
  imageCount?: unknown;
};

type ScraperJob = {
  jobId?: unknown;
  posts?: unknown;
};

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
}

function toStringArray(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeFacebookUrl(value: string) {
  const raw = toTrimmedString(value);
  if (!raw) {
    return "";
  }
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    const host = parsed.hostname.toLowerCase();
    if (host === "web.facebook.com" || host === "m.facebook.com") {
      parsed.hostname = "www.facebook.com";
    }
    const normalized = parsed.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return raw;
  }
}

function collectJobIdsFromText(text: string) {
  const ids = new Set<string>();
  const regex = /jobId=([a-zA-Z0-9_-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      ids.add(match[1]);
    }
  }
  return Array.from(ids);
}

async function findJobFileById(scraperRoot: string, jobId: string) {
  const jobsRoot = path.join(scraperRoot, "storage", "jobs");
  const dateDirs = await readdir(jobsRoot, { withFileTypes: true }).catch(() => []);
  for (const dateDir of dateDirs) {
    if (!dateDir.isDirectory()) {
      continue;
    }
    const candidate = path.join(jobsRoot, dateDir.name, `${jobId}.json`);
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

function extractImageUrlsFromRaw(raw: Record<string, unknown>) {
  const rawImageUrls = toStringArray(raw.rawImageUrls);
  const rawImageUrlsFromAlbumSet = toStringArray(raw.rawImageUrlsFromAlbumSet);
  const rawImageUrlsFromSource = toStringArray(raw.rawImageUrlsFromSource);
  const rawImageUrlsFromGallery = toStringArray(raw.rawImageUrlsFromGallery);

  const downloadedOriginals = Array.isArray(raw.images)
    ? raw.images
        .map((item) => toRecord(item))
        .map((item) => toTrimmedString(item?.originalUrl))
        .filter(Boolean)
    : [];

  return uniqueStrings([
    ...rawImageUrls,
    ...rawImageUrlsFromAlbumSet,
    ...rawImageUrlsFromSource,
    ...rawImageUrlsFromGallery,
    ...downloadedOriginals,
  ]).filter((url) => url.startsWith("http://") || url.startsWith("https://"));
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

export async function resolveOriginalFacebookPostMediaFromLocalScraper(
  input: ResolveOriginalFacebookPostMediaFromLocalScraperInput,
): Promise<ResolveOriginalFacebookPostMediaFromLocalScraperResult> {
  const fallbackUrls = uniqueStrings(input.fallbackUrls).filter((url) =>
    url.startsWith("http://") || url.startsWith("https://"),
  );
  const normalizedPostUrl = normalizeFacebookUrl(input.postUrl);
  const scraperRoot = toTrimmedString(process.env.SOCIAL_IMPORT_SCRAPER_ROOT);

  const details: ResolveOriginalFacebookPostMediaFromLocalScraperResult["details"] = {
    sourcePostUrl: input.postUrl,
    normalizedPostUrl,
    scraperRoot: scraperRoot || null,
    commandExecuted: false,
    commandExitCode: null,
    commandTimedOut: false,
    jobId: null,
    jobFilePath: null,
    jobReportedImageCount: 0,
    rawPostId: null,
    resolvedImageCount: 0,
    errorCode: null,
    stderrTail: null,
  };

  if (!normalizedPostUrl) {
    details.errorCode = "POST_URL_INVALID";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  if (!scraperRoot) {
    details.errorCode = "SCRAPER_ROOT_NOT_CONFIGURED";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  const announcerUid = toTrimmedString(input.announcerUid);
  if (!announcerUid) {
    details.errorCode = "ANNOUNCER_UID_MISSING";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  const timeoutMs = Math.max(30000, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const headless = input.headless ?? DEFAULT_HEADLESS;
  const args = [
    "run",
    "scrape:run",
    "--",
    `--advertiser-uuid=${announcerUid}`,
    `--force-url=${normalizedPostUrl}`,
    "--limit=1",
    "--include-imported=true",
    `--headless=${headless ? "true" : "false"}`,
  ];

  let stdoutBuffer = "";
  let stderrBuffer = "";
  details.commandExecuted = true;

  const commandExitCode = await new Promise<number | null>((resolve) => {
    const child = spawn("npm", args, {
      cwd: scraperRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
      },
    });

    const timer = setTimeout(() => {
      details.commandTimedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000);
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      if (stdoutBuffer.length > 160000) {
        stdoutBuffer = stdoutBuffer.slice(-160000);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderrBuffer += chunk.toString();
      if (stderrBuffer.length > 160000) {
        stderrBuffer = stderrBuffer.slice(-160000);
      }
    });

    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });

  details.commandExitCode = commandExitCode;
  details.stderrTail = stderrBuffer ? stderrBuffer.slice(-1200) : null;

  if (commandExitCode !== 0) {
    details.errorCode = details.commandTimedOut
      ? "SCRAPER_TIMEOUT"
      : "SCRAPER_COMMAND_FAILED";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  const allOutput = `${stdoutBuffer}\n${stderrBuffer}`;
  const jobIds = collectJobIdsFromText(allOutput);
  const jobId = jobIds.length > 0 ? jobIds[jobIds.length - 1] : null;
  details.jobId = jobId;

  if (!jobId) {
    details.errorCode = "SCRAPER_JOB_ID_NOT_FOUND";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  const jobFilePath = await findJobFileById(scraperRoot, jobId);
  details.jobFilePath = jobFilePath;
  if (!jobFilePath) {
    details.errorCode = "SCRAPER_JOB_FILE_NOT_FOUND";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  let job: ScraperJob | null = null;
  try {
    job = JSON.parse(await readFile(jobFilePath, "utf8")) as ScraperJob;
  } catch {
    details.errorCode = "SCRAPER_JOB_PARSE_FAILED";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  const posts = Array.isArray(job.posts) ? (job.posts as ScraperJobPost[]) : [];
  const normalizedTarget = normalizeFacebookUrl(normalizedPostUrl);
  const matchedPost =
    posts.find((post) => normalizeFacebookUrl(toTrimmedString(post.url)) === normalizedTarget) ??
    posts[0] ??
    null;

  if (!matchedPost) {
    details.errorCode = "SCRAPER_JOB_POST_EMPTY";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  const rawPostId = toTrimmedString(matchedPost.rawPostId);
  details.rawPostId = rawPostId || null;
  details.jobReportedImageCount = toNumber(matchedPost.imageCount);
  if (!rawPostId) {
    details.errorCode = "SCRAPER_RAW_POST_ID_MISSING";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  const rawPostPath = path.join(scraperRoot, "storage", "raw", "posts", `${rawPostId}.json`);
  let rawPost: Record<string, unknown> | null = null;
  try {
    rawPost = JSON.parse(await readFile(rawPostPath, "utf8")) as Record<string, unknown>;
  } catch {
    details.errorCode = "SCRAPER_RAW_POST_PARSE_FAILED";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  const resolvedUrls = extractImageUrlsFromRaw(rawPost);
  details.resolvedImageCount = resolvedUrls.length;

  if (resolvedUrls.length === 0) {
    details.errorCode = "SCRAPER_NO_IMAGES";
    return { imageUrls: fallbackUrls, usedFallback: true, details };
  }

  return {
    imageUrls: resolvedUrls,
    usedFallback: false,
    details,
  };
}
