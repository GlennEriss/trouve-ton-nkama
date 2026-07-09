import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import { listSocialImportJobs } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const querySchema = z.object({
  maxRows: z.coerce.number().int().min(1).max(200000).optional(),
  status: z
    .enum(["all", "running", "completed", "failed", "partial", "needs_review"])
    .optional(),
  announcerUid: z.string().trim().optional(),
  startedFrom: z.string().trim().optional(),
  startedTo: z.string().trim().optional(),
  query: z.string().trim().optional(),
});

const PAGE_SIZE = 500;
const DEFAULT_MAX_ROWS = 50000;

export async function GET(request: NextRequest) {
  const auth = await requireSocialImportPermission(request, "social_import.export");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    maxRows: request.nextUrl.searchParams.get("maxRows") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    announcerUid: request.nextUrl.searchParams.get("announcerUid") ?? undefined,
    startedFrom: request.nextUrl.searchParams.get("startedFrom") ?? undefined,
    startedTo: request.nextUrl.searchParams.get("startedTo") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
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

  const maxRows = parsed.data.maxRows ?? DEFAULT_MAX_ROWS;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            toCsvLine([
              "job_id",
              "status",
              "mode",
              "environment",
              "announcer_scope",
              "raw_fetched",
              "normalized_ok",
              "needs_review",
              "published",
              "rejected",
              "started_at",
              "ended_at",
              "triggered_by",
              "error_summary",
            ]),
          ),
        );

        let cursor: string | null = null;
        let exportedRows = 0;

        while (exportedRows < maxRows) {
          const page = await listSocialImportJobs({
            limit: Math.min(PAGE_SIZE, maxRows - exportedRows),
            cursor,
            status: parsed.data.status,
            announcerUid: parsed.data.announcerUid,
            startedFrom: parsed.data.startedFrom,
            startedTo: parsed.data.startedTo,
            query: parsed.data.query,
          });

          if (page.jobs.length === 0) {
            break;
          }

          for (const row of page.jobs) {
            if (exportedRows >= maxRows) {
              break;
            }
            controller.enqueue(
              encoder.encode(
                toCsvLine([
                  row.id,
                  row.status,
                  row.mode,
                  row.environment,
                  row.announcerScope.join("|"),
                  row.counters.rawFetched,
                  row.counters.normalizedOk,
                  row.counters.needsReview,
                  row.counters.published,
                  row.counters.rejected,
                  row.startedAt ?? "",
                  row.endedAt ?? "",
                  row.triggeredBy ?? "",
                  row.errorSummary ?? "",
                ]),
              ),
            );
            exportedRows += 1;
          }

          if (!page.page.hasMore || !page.page.nextCursor) {
            break;
          }
          cursor = page.page.nextCursor;
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("export-social-import-jobs")}"`,
      "Cache-Control": "no-store",
      "x-correlation-id": auth.correlationId,
    },
  });
}
