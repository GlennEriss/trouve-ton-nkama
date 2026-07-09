import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import {
  listSocialImportDecisions,
  listSocialImportJobs,
  listSocialImportReview,
  listSocialImportSources,
} from "@/modules/social-import/application/social-import.service";
import type {
  SocialImportDecision,
  SocialImportReviewCandidate,
  SocialImportSource,
} from "@/modules/social-import/domain/types";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const querySchema = z.object({
  announcerUid: z.string().trim().optional(),
  query: z.string().trim().optional(),
  sourceStatus: z.enum(["all", "active", "paused", "revoked"]).optional(),
  jobStatus: z
    .enum(["all", "running", "completed", "failed", "partial", "needs_review"])
    .optional(),
  reviewStatus: z
    .enum(["all", "ready_to_publish", "needs_review", "rejected", "published"])
    .optional(),
  decision: z.enum(["all", "publish", "reject", "archive_duplicate", "retry"]).optional(),
  startedFrom: z.string().trim().optional(),
  startedTo: z.string().trim().optional(),
});

const PAGE_SIZE = 500;

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  const counters = new Map<string, number>();
  for (const item of items) {
    const key = (getKey(item) || "unknown").trim() || "unknown";
    counters.set(key, (counters.get(key) || 0) + 1);
  }
  return counters;
}

async function loadAllJobs(input: {
  query?: string;
  announcerUid?: string;
  status?: "all" | "running" | "completed" | "failed" | "partial" | "needs_review";
  startedFrom?: string;
  startedTo?: string;
}) {
  const rows = [] as Awaited<ReturnType<typeof listSocialImportJobs>>["jobs"];
  let cursor: string | null = null;

  for (;;) {
    const page = await listSocialImportJobs({
      limit: PAGE_SIZE,
      cursor,
      status: input.status,
      announcerUid: input.announcerUid,
      query: input.query,
      startedFrom: input.startedFrom,
      startedTo: input.startedTo,
    });
    rows.push(...page.jobs);
    if (!page.page.hasMore || !page.page.nextCursor) {
      break;
    }
    cursor = page.page.nextCursor;
  }

  return rows;
}

async function loadAllReview(input: {
  query?: string;
  announcerUid?: string;
  status?: "all" | "ready_to_publish" | "needs_review" | "rejected" | "published";
}) {
  const rows = [] as SocialImportReviewCandidate[];
  let cursor: string | null = null;

  for (;;) {
    const page = await listSocialImportReview({
      limit: PAGE_SIZE,
      cursor,
      status: input.status,
      announcerUid: input.announcerUid,
      query: input.query,
    });
    rows.push(...page.candidates);
    if (!page.page.hasMore || !page.page.nextCursor) {
      break;
    }
    cursor = page.page.nextCursor;
  }

  return rows;
}

async function loadAllSources(input: {
  query?: string;
  announcerUid?: string;
  status?: "all" | "active" | "paused" | "revoked";
}) {
  const rows = [] as SocialImportSource[];
  let cursor: string | null = null;

  for (;;) {
    const page = await listSocialImportSources({
      limit: PAGE_SIZE,
      cursor,
      status: input.status,
      announcerUid: input.announcerUid,
      query: input.query,
    });
    rows.push(...page.sources);
    if (!page.page.hasMore || !page.page.nextCursor) {
      break;
    }
    cursor = page.page.nextCursor;
  }

  return rows;
}

async function loadAllDecisions(input: {
  query?: string;
  announcerUid?: string;
  decision?: "all" | "publish" | "reject" | "archive_duplicate" | "retry";
}) {
  const rows = [] as SocialImportDecision[];
  let cursor: string | null = null;

  for (;;) {
    const page = await listSocialImportDecisions({
      limit: PAGE_SIZE,
      cursor,
      decision: input.decision,
      announcerUid: input.announcerUid,
      query: input.query,
    });
    rows.push(...page.decisions);
    if (!page.page.hasMore || !page.page.nextCursor) {
      break;
    }
    cursor = page.page.nextCursor;
  }

  return rows;
}

export async function GET(request: NextRequest) {
  const auth = await requireSocialImportPermission(request, "social_import.export");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    announcerUid: request.nextUrl.searchParams.get("announcerUid") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    sourceStatus: request.nextUrl.searchParams.get("sourceStatus") ?? undefined,
    jobStatus: request.nextUrl.searchParams.get("jobStatus") ?? undefined,
    reviewStatus: request.nextUrl.searchParams.get("reviewStatus") ?? undefined,
    decision: request.nextUrl.searchParams.get("decision") ?? undefined,
    startedFrom: request.nextUrl.searchParams.get("startedFrom") ?? undefined,
    startedTo: request.nextUrl.searchParams.get("startedTo") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Paramètres de requête invalides.",
        details: { issues: parsed.error.issues },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const [jobs, review, sources, decisions] = await Promise.all([
      loadAllJobs({
        query: parsed.data.query,
        announcerUid: parsed.data.announcerUid,
        status: parsed.data.jobStatus,
        startedFrom: parsed.data.startedFrom,
        startedTo: parsed.data.startedTo,
      }),
      loadAllReview({
        query: parsed.data.query,
        announcerUid: parsed.data.announcerUid,
        status: parsed.data.reviewStatus,
      }),
      loadAllSources({
        query: parsed.data.query,
        announcerUid: parsed.data.announcerUid,
        status: parsed.data.sourceStatus,
      }),
      loadAllDecisions({
        query: parsed.data.query,
        announcerUid: parsed.data.announcerUid,
        decision: parsed.data.decision,
      }),
    ]);

    const jobsByStatus = countBy(jobs, (item) => item.status);
    const reviewByStatus = countBy(review, (item) => item.status);
    const sourceByStatus = countBy(sources, (item) => item.status);
    const decisionByType = countBy(decisions, (item) => item.decision);

    const rows: Array<[string, string | number, string]> = [
      ["generated_at", new Date().toISOString(), "date génération export"],
      ["jobs_total", jobs.length, "jobs alignés avec filtres actifs"],
      ["jobs_running", jobsByStatus.get("running") || 0, ""] ,
      ["jobs_completed", jobsByStatus.get("completed") || 0, ""],
      ["jobs_failed", jobsByStatus.get("failed") || 0, ""],
      ["jobs_partial", jobsByStatus.get("partial") || 0, ""],
      ["jobs_needs_review", jobsByStatus.get("needs_review") || 0, ""],
      ["review_total", review.length, "candidates review alignées"],
      ["review_ready_to_publish", reviewByStatus.get("ready_to_publish") || 0, ""],
      ["review_needs_review", reviewByStatus.get("needs_review") || 0, ""],
      ["review_rejected", reviewByStatus.get("rejected") || 0, ""],
      ["review_published", reviewByStatus.get("published") || 0, ""],
      ["sources_total", sources.length, "sources alignées"],
      ["sources_active", sourceByStatus.get("active") || 0, ""],
      ["sources_paused", sourceByStatus.get("paused") || 0, ""],
      ["sources_revoked", sourceByStatus.get("revoked") || 0, ""],
      ["decisions_total", decisions.length, "décisions alignées"],
      ["decisions_publish", decisionByType.get("publish") || 0, ""],
      ["decisions_reject", decisionByType.get("reject") || 0, ""],
      ["decisions_archive_duplicate", decisionByType.get("archive_duplicate") || 0, ""],
      ["decisions_retry", decisionByType.get("retry") || 0, ""],
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(toCsvLine(["metric", "value", "note"])),
        );
        for (const row of rows) {
          controller.enqueue(encoder.encode(toCsvLine(row)));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("export-social-import-kpi")}"`,
        "Cache-Control": "no-store",
        "x-correlation-id": auth.correlationId,
      },
    });
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'exporter les KPI social import.",
      },
      500,
      auth.correlationId,
    );
  }
}
