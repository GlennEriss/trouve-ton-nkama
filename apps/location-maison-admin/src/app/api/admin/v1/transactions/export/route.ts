import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import { listFinanceTransactions } from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  query: z.string().trim().optional(),
  uid: z.string().trim().optional(),
  type: z.enum(["all", "purchase", "spend", "grant"]).optional(),
  status: z.enum(["all", "pending", "success", "failed", "cancelled"]).optional(),
  createdAfter: z.string().trim().optional(),
  createdBefore: z.string().trim().optional(),
  maxRows: z.coerce.number().int().min(1).max(200000).optional(),
});

const PAGE_SIZE = 300;
const DEFAULT_MAX_ROWS = 50000;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "transactions.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    uid: request.nextUrl.searchParams.get("uid") ?? undefined,
    type: request.nextUrl.searchParams.get("type") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    createdAfter: request.nextUrl.searchParams.get("createdAfter") ?? undefined,
    createdBefore: request.nextUrl.searchParams.get("createdBefore") ?? undefined,
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
              "transaction_id",
              "created_at",
              "uid",
              "type",
              "status",
              "credits",
              "amount",
              "pack_id",
              "pack_name",
              "provider",
              "service",
              "description",
              "phone_number",
              "property_id",
              "completed_at",
              "failure_reason",
            ]),
          ),
        );

        while (exportedRows < maxRows) {
          const page = await listFinanceTransactions({
            limit: PAGE_SIZE,
            cursor,
            query: parsed.data.query,
            uid: parsed.data.uid,
            type: parsed.data.type,
            status: parsed.data.status,
            createdAfter: parsed.data.createdAfter,
            createdBefore: parsed.data.createdBefore,
          });

          for (let index = 0; index < page.transactions.length && exportedRows < maxRows; index += 1) {
            const tx = page.transactions[index];
            controller.enqueue(
              encoder.encode(
                toCsvLine([
                  tx.id,
                  tx.createdAt ?? "",
                  tx.uid ?? "",
                  tx.type,
                  tx.status,
                  tx.credits,
                  tx.amount ?? "",
                  tx.packId ?? "",
                  tx.packName ?? "",
                  tx.provider ?? "",
                  tx.service ?? "",
                  tx.description ?? "",
                  tx.phoneNumber ?? "",
                  tx.propertyId ?? "",
                  tx.completedAt ?? "",
                  tx.failureReason ?? "",
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
      "Content-Disposition": `attachment; filename="${csvFilename("export-finance-transactions")}"`,
      "Cache-Control": "no-store",
      "x-correlation-id": auth.correlationId,
    },
  });
}
