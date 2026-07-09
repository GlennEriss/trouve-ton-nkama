import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import { listFinanceWallets } from "@/modules/finance-credits/application/finance-credits.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  query: z.string().trim().optional(),
  role: z.enum(["all", "user", "announcer", "admin"]).optional(),
  status: z.enum(["all", "active", "suspended", "archived"]).optional(),
  presence: z.enum(["all", "online", "offline"]).optional(),
  maxRows: z.coerce.number().int().min(1).max(200000).optional(),
});

const PAGE_SIZE = 500;
const DEFAULT_MAX_ROWS = 50000;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "credits.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    role: request.nextUrl.searchParams.get("role") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    presence: request.nextUrl.searchParams.get("presence") ?? undefined,
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
              "uid",
              "nom_complet",
              "email",
              "roles",
              "credits",
              "statut",
              "presence",
              "dernier_seen_at",
              "created_at",
            ]),
          ),
        );

        while (exportedRows < maxRows) {
          const page = await listFinanceWallets({
            limit: PAGE_SIZE,
            cursor,
            query: parsed.data.query,
            role: parsed.data.role,
            status: parsed.data.status,
            presence: parsed.data.presence,
          });

          for (let index = 0; index < page.wallets.length && exportedRows < maxRows; index += 1) {
            const wallet = page.wallets[index];
            const status =
              wallet.state === "ARCHIVED"
                ? "archived"
                : wallet.isSuspended
                  ? "suspended"
                  : "active";
            controller.enqueue(
              encoder.encode(
                toCsvLine([
                  wallet.uid,
                  wallet.fullName,
                  wallet.email ?? "",
                  wallet.roles.join("|"),
                  wallet.credits,
                  status,
                  wallet.presenceStatus,
                  wallet.lastSeenAt ?? "",
                  wallet.createdAt ?? "",
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
      "Content-Disposition": `attachment; filename="${csvFilename("export-finance-wallets")}"`,
      "Cache-Control": "no-store",
      "x-correlation-id": auth.correlationId,
    },
  });
}
