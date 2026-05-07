import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import { listFinanceRefunds } from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  query: z.string().trim().optional(),
  status: z.enum(["all", "pending", "approved", "rejected", "failed", "success"]).optional(),
  maxRows: z.coerce.number().int().min(1).max(200000).optional(),
});

const PAGE_SIZE = 300;
const DEFAULT_MAX_ROWS = 50000;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "refunds.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    maxRows: request.nextUrl.searchParams.get("maxRows") ?? undefined,
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
  let cursor: string | null = null;
  let exportedRows = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            toCsvLine([
              "refund_id",
              "created_at",
              "phone_number",
              "amount",
              "status",
              "reason",
              "reviewed_by",
              "reviewed_at",
              "decision_note",
              "refunded_at",
            ]),
          ),
        );

        while (exportedRows < maxRows) {
          const page = await listFinanceRefunds({
            limit: PAGE_SIZE,
            cursor,
            query: parsed.data.query,
            status: parsed.data.status,
          });

          for (let index = 0; index < page.refunds.length && exportedRows < maxRows; index += 1) {
            const refund = page.refunds[index];
            controller.enqueue(
              encoder.encode(
                toCsvLine([
                  refund.id,
                  refund.createdAt ?? "",
                  refund.phoneNumber ?? "",
                  refund.amount ?? "",
                  refund.status,
                  refund.reason ?? "",
                  refund.reviewedBy ?? "",
                  refund.reviewedAt ?? "",
                  refund.decisionNote ?? "",
                  refund.refundedAt ?? "",
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
      "Content-Disposition": `attachment; filename="${csvFilename("export-finance-refunds")}"`,
      "Cache-Control": "no-store",
      "x-correlation-id": auth.correlationId,
    },
  });
}
