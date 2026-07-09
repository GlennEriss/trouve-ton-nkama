import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { listSocialImportDecisions } from "@/modules/social-import/application/social-import.service";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().trim().min(1).optional(),
  decision: z.enum(["all", "publish", "reject", "archive_duplicate", "retry"]).optional(),
  jobId: z.string().trim().optional(),
  announcerUid: z.string().trim().optional(),
  query: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireSocialImportPermission(request, "social_import.decision.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    decision: request.nextUrl.searchParams.get("decision") ?? undefined,
    jobId: request.nextUrl.searchParams.get("jobId") ?? undefined,
    announcerUid: request.nextUrl.searchParams.get("announcerUid") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
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

  const result = await listSocialImportDecisions({
    limit: parsed.data.limit ?? 100,
    cursor: parsed.data.cursor,
    decision: parsed.data.decision,
    jobId: parsed.data.jobId,
    announcerUid: parsed.data.announcerUid,
    query: parsed.data.query,
  });

  return jsonSuccess(result, auth.correlationId);
}
