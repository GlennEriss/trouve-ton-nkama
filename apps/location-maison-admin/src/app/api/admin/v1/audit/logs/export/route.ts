import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import { listFinanceAuditLogs } from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  actionPrefix: z.string().trim().optional(),
  status: z.enum(["all", "success", "failed", "denied"]).optional(),
  actorId: z.string().trim().min(1).optional(),
  query: z.string().trim().optional(),
  maxRows: z.coerce.number().int().min(1).max(200000).optional(),
});

const PAGE_SIZE = 300;
const DEFAULT_MAX_ROWS = 50000;

function jsonStringifySafe(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "audit_logs.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    actionPrefix: request.nextUrl.searchParams.get("actionPrefix") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    actorId: request.nextUrl.searchParams.get("actorId") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    maxRows: request.nextUrl.searchParams.get("maxRows") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Paramètres de requête invalides.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  const maxRows = parsed.data.maxRows ?? DEFAULT_MAX_ROWS;
  const encoder = new TextEncoder();
  let cursor: string | null = null;
  let exportedRows = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            toCsvLine([
              "id",
              "created_at",
              "action",
              "status",
              "actor_id",
              "actor_roles",
              "resource",
              "resource_id",
              "correlation_id",
              "diff_json",
              "details_json",
            ]),
          ),
        );

        while (exportedRows < maxRows) {
          const page = await listFinanceAuditLogs({
            limit: PAGE_SIZE,
            cursor,
            actionPrefix: parsed.data.actionPrefix,
            status: parsed.data.status,
            actorId: parsed.data.actorId,
            query: parsed.data.query,
          });

          for (let index = 0; index < page.logs.length && exportedRows < maxRows; index += 1) {
            const log = page.logs[index];
            controller.enqueue(
              encoder.encode(
                toCsvLine([
                  log.id,
                  log.createdAt ?? "",
                  log.action,
                  log.status ?? "",
                  log.actorId ?? "",
                  log.actorRoles.join("|"),
                  log.resource ?? "",
                  log.resourceId ?? "",
                  log.correlationId ?? "",
                  jsonStringifySafe(log.diff),
                  jsonStringifySafe(log.details),
                ]),
              ),
            );
            exportedRows += 1;
          }

          const nextCursor = page.page.nextCursor;
          if (!page.page.hasMore || !nextCursor || nextCursor === cursor) {
            break;
          }
          cursor = nextCursor;
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
      "Content-Disposition": `attachment; filename="${csvFilename("export-finance-audit-logs")}"`,
      "Cache-Control": "no-store",
      "x-correlation-id": auth.correlationId,
    },
  });
}
