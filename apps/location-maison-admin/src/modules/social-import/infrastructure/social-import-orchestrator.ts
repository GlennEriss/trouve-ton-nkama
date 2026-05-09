import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { patchSocialImportJobById } from "@/modules/social-import/infrastructure/social-import.repository";

export type SocialImportRunDispatchInput = {
  jobId: string;
  announcerUid: string;
  environment: "dev" | "preprod" | "prod";
  executionMode: "auto" | "orchestrator" | "local";
  allowLocalProd: boolean;
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
  mode: "http" | "local_command";
  accepted: boolean;
  externalRunId: string | null;
  message: string | null;
};

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

async function dispatchViaHttp(
  input: SocialImportRunDispatchInput,
  orchestratorUrl: string,
): Promise<SocialImportRunDispatchResult> {
  const controller = new AbortController();
  const timeoutMs = Math.max(
    5_000,
    Number(process.env.SOCIAL_IMPORT_ORCHESTRATOR_TIMEOUT_MS ?? 30_000),
  );
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-correlation-id": input.correlationId,
    };
    const token = process.env.SOCIAL_IMPORT_ORCHESTRATOR_TOKEN?.trim();
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(orchestratorUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jobId: input.jobId,
        announcerUid: input.announcerUid,
        environment: input.environment,
        limit: input.limit,
        includeImported: input.includeImported,
        headless: input.headless,
        reason: input.reason,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        actorUid: input.actorUid,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`SOCIAL_IMPORT_ORCHESTRATOR_HTTP_${response.status}`);
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          runId?: string;
          data?: {
            runId?: string;
          };
          message?: string;
        }
      | null;

    return {
      mode: "http",
      accepted: true,
      externalRunId:
        payload?.runId?.trim() ||
        payload?.data?.runId?.trim() ||
        null,
      message: payload?.message?.trim() || null,
    };
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SOCIAL_IMPORT_ORCHESTRATOR_HTTP_FAILED";

    await patchSocialImportJobById({
      jobId: input.jobId,
      patch: {
        status: "failed",
        endedAt: new Date().toISOString(),
        errorSummary: code,
      },
    }).catch(() => undefined);

    throw new Error("SOCIAL_IMPORT_ORCHESTRATOR_REQUEST_FAILED");
  } finally {
    clearTimeout(timeoutHandle);
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
      await patchSocialImportJobById({
        jobId: input.jobId,
        patch: {
          status: "completed",
          endedAt,
          errorSummary: null,
          counters: counters ?? undefined,
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
  const executionMode = input.executionMode;
  const orchestratorUrl = process.env.SOCIAL_IMPORT_ORCHESTRATOR_URL?.trim();

  if (executionMode === "orchestrator") {
    if (!orchestratorUrl) {
      throw new Error("SOCIAL_IMPORT_ORCHESTRATOR_URL_REQUIRED");
    }
    return dispatchViaHttp(input, orchestratorUrl);
  }

  if (executionMode === "local") {
    if (input.environment === "prod" && !input.allowLocalProd) {
      throw new Error("SOCIAL_IMPORT_ORCHESTRATOR_PROD_LOCAL_FORBIDDEN");
    }
    return dispatchViaLocalCommand(input);
  }

  if (orchestratorUrl) {
    return dispatchViaHttp(input, orchestratorUrl);
  }

  if (input.environment === "prod" && !input.allowLocalProd) {
    throw new Error("SOCIAL_IMPORT_ORCHESTRATOR_PROD_LOCAL_FORBIDDEN");
  }

  return dispatchViaLocalCommand(input);
}
