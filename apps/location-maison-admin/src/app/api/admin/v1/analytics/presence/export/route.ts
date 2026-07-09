import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import {
  listAdminsLastLogin,
  listPresenceLastSeen,
} from "@/modules/analytics-insights/application/presence-analytics-read.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z
  .object({
    range: z.enum(["24h", "7d", "30d", "custom"]).optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
    includeUsers: z.coerce.boolean().optional(),
    includeAdminsPresence: z.coerce.boolean().optional(),
    includeAdminsLastLogin: z.coerce.boolean().optional(),
    maxRows: z.coerce.number().int().min(1).max(200000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.range === "custom" && (!value.start || !value.end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les paramètres start et end sont requis si range=custom.",
        path: ["range"],
      });
    }
  });

const PAGE_SIZE = 500;
const DEFAULT_MAX_ROWS = 50000;

type ExportContext = {
  range?: "24h" | "7d" | "30d" | "custom";
  start?: string;
  end?: string;
};

function mapServiceError(error: unknown) {
  if (error instanceof Error && error.message === "INVALID_CURSOR") {
    return {
      status: 400,
      code: "VALIDATION_ERROR" as const,
      message: "Cursor invalide.",
    };
  }

  if (error instanceof Error && error.message === "RANGE_CUSTOM_START_AFTER_END") {
    return {
      status: 400,
      code: "VALIDATION_ERROR" as const,
      message: "La date start doit être strictement inférieure à end.",
    };
  }

  if (error instanceof Error && error.message === "RANGE_CUSTOM_REQUIRES_VALID_START_END") {
    return {
      status: 400,
      code: "VALIDATION_ERROR" as const,
      message: "Les paramètres start/end sont invalides pour range=custom.",
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR" as const,
    message: error instanceof Error ? error.message : "Impossible d'exporter la présence.",
  };
}

function resolveRequestedSection(value: boolean | undefined, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    range: request.nextUrl.searchParams.get("range") ?? undefined,
    start: request.nextUrl.searchParams.get("start") ?? undefined,
    end: request.nextUrl.searchParams.get("end") ?? undefined,
    includeUsers: request.nextUrl.searchParams.get("includeUsers") ?? undefined,
    includeAdminsPresence:
      request.nextUrl.searchParams.get("includeAdminsPresence") ?? undefined,
    includeAdminsLastLogin:
      request.nextUrl.searchParams.get("includeAdminsLastLogin") ?? undefined,
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

  const canUsersLastSeen = hasPermission(auth.admin.permissions, "users.view_last_seen");
  const canAdminsPresence = hasPermission(auth.admin.permissions, "admins.view_presence");
  const canAdminsLastLogin = hasPermission(auth.admin.permissions, "admins.view_last_login");

  const includeUsersRequested = resolveRequestedSection(parsed.data.includeUsers, true);
  const includeAdminsPresenceRequested = resolveRequestedSection(
    parsed.data.includeAdminsPresence,
    true,
  );
  const includeAdminsLastLoginRequested = resolveRequestedSection(
    parsed.data.includeAdminsLastLogin,
    true,
  );

  const includeUsers = includeUsersRequested && canUsersLastSeen;
  const includeAdminsPresence = includeAdminsPresenceRequested && canAdminsPresence;
  const includeAdminsLastLogin = includeAdminsLastLoginRequested && canAdminsLastLogin;

  if (!includeUsers && !includeAdminsPresence && !includeAdminsLastLogin) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Aucune permission disponible pour exporter les données de présence demandées.",
      },
      403,
      auth.correlationId,
    );
  }

  const maxRows = parsed.data.maxRows ?? DEFAULT_MAX_ROWS;
  const encoder = new TextEncoder();
  const exportContext: ExportContext = {
    range: parsed.data.range,
    start: parsed.data.start,
    end: parsed.data.end,
  };

  let exportedRows = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            toCsvLine([
              "row_type",
              "subject",
              "subject_id",
              "email",
              "display_name",
              "roles",
              "status",
              "is_online",
              "last_seen_at",
              "last_login_at",
              "source",
              "device_type",
              "app_surface",
              "session_id",
              "correlation_id",
              "period_range",
              "period_start_at",
              "period_end_at",
            ]),
          ),
        );

        if (includeUsers && exportedRows < maxRows) {
          let cursor: string | null = null;
          while (exportedRows < maxRows) {
            const page = await listPresenceLastSeen({
              subject: "user",
              range: exportContext.range,
              start: exportContext.start,
              end: exportContext.end,
              limit: PAGE_SIZE,
              cursor,
            });

            for (let index = 0; index < page.records.length && exportedRows < maxRows; index += 1) {
              const row = page.records[index];
              controller.enqueue(
                encoder.encode(
                  toCsvLine([
                    "user_presence_last_seen",
                    "user",
                    row.subjectId,
                    "",
                    "",
                    "",
                    row.status,
                    row.isOnline,
                    row.lastSeenAt ?? "",
                    "",
                    row.source ?? "",
                    row.deviceType ?? "",
                    row.appSurface ?? "",
                    row.sessionId ?? "",
                    row.correlationId ?? "",
                    page.period.range,
                    page.period.startAt,
                    page.period.endAt,
                  ]),
                ),
              );
              exportedRows += 1;
            }

            if (!page.page.hasMore || !page.page.nextCursor || page.page.nextCursor === cursor) {
              break;
            }
            cursor = page.page.nextCursor;
          }
        }

        if (includeAdminsPresence && exportedRows < maxRows) {
          let cursor: string | null = null;
          while (exportedRows < maxRows) {
            const page = await listPresenceLastSeen({
              subject: "admin",
              range: exportContext.range,
              start: exportContext.start,
              end: exportContext.end,
              limit: PAGE_SIZE,
              cursor,
            });

            for (let index = 0; index < page.records.length && exportedRows < maxRows; index += 1) {
              const row = page.records[index];
              controller.enqueue(
                encoder.encode(
                  toCsvLine([
                    "admin_presence_last_seen",
                    "admin",
                    row.subjectId,
                    "",
                    "",
                    "",
                    row.status,
                    row.isOnline,
                    row.lastSeenAt ?? "",
                    "",
                    row.source ?? "",
                    row.deviceType ?? "",
                    row.appSurface ?? "",
                    row.sessionId ?? "",
                    row.correlationId ?? "",
                    page.period.range,
                    page.period.startAt,
                    page.period.endAt,
                  ]),
                ),
              );
              exportedRows += 1;
            }

            if (!page.page.hasMore || !page.page.nextCursor || page.page.nextCursor === cursor) {
              break;
            }
            cursor = page.page.nextCursor;
          }
        }

        if (includeAdminsLastLogin && exportedRows < maxRows) {
          let cursor: string | null = null;

          while (exportedRows < maxRows) {
            const page = await listAdminsLastLogin({
              limit: PAGE_SIZE,
              cursor,
            });

            for (let index = 0; index < page.records.length && exportedRows < maxRows; index += 1) {
              const row = page.records[index];
              controller.enqueue(
                encoder.encode(
                  toCsvLine([
                    "admin_last_login",
                    "admin",
                    row.uid,
                    row.email,
                    row.displayName ?? "",
                    row.roles.join("|"),
                    row.status,
                    row.isOnline,
                    row.lastSeenAt ?? "",
                    row.lastLoginAt ?? "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                  ]),
                ),
              );
              exportedRows += 1;
            }

            if (!page.page.hasMore || !page.page.nextCursor || page.page.nextCursor === cursor) {
              break;
            }
            cursor = page.page.nextCursor;
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  try {
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("export-analytics-presence")}"`,
        "Cache-Control": "no-store",
        "x-correlation-id": auth.correlationId,
      },
    });
  } catch (error) {
    const mapped = mapServiceError(error);
    return jsonError(
      {
        code: mapped.code,
        message: mapped.message,
      },
      mapped.status,
      auth.correlationId,
    );
  }
}
