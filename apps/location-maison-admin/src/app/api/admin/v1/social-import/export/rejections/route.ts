import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import { listSocialImportDecisions } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const querySchema = z.object({
  maxRows: z.coerce.number().int().min(1).max(200000).optional(),
  jobId: z.string().trim().optional(),
  announcerUid: z.string().trim().optional(),
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
    jobId: request.nextUrl.searchParams.get("jobId") ?? undefined,
    announcerUid: request.nextUrl.searchParams.get("announcerUid") ?? undefined,
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
              "decision_id",
              "created_at",
              "job_id",
              "announcer_uid",
              "raw_post_id",
              "decision",
              "reason",
              "actor_id",
            ]),
          ),
        );

        let cursor: string | null = null;
        let exportedRows = 0;

        while (exportedRows < maxRows) {
          const page = await listSocialImportDecisions({
            limit: Math.min(PAGE_SIZE, maxRows - exportedRows),
            cursor,
            decision: "reject",
            jobId: parsed.data.jobId,
            announcerUid: parsed.data.announcerUid,
            query: parsed.data.query,
          });

          if (page.decisions.length === 0) {
            break;
          }

          for (const row of page.decisions) {
            if (exportedRows >= maxRows) {
              break;
            }
            controller.enqueue(
              encoder.encode(
                toCsvLine([
                  row.id,
                  row.createdAt ?? "",
                  row.jobId ?? "",
                  row.announcerUid ?? "",
                  row.rawPostId ?? "",
                  row.decision,
                  row.reason ?? "",
                  row.actorId ?? "",
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
      "Content-Disposition": `attachment; filename="${csvFilename("export-social-import-rejets")}"`,
      "Cache-Control": "no-store",
      "x-correlation-id": auth.correlationId,
    },
  });
}
