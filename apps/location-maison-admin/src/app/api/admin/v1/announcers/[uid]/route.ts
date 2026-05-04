import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getAnnouncerDetails } from "@/modules/announcer-management/application/announcer-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type RouteContext = {
  params: Promise<{ uid: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "announcers.read");

  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const uid = params.uid?.trim();

  if (!uid) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant annonceur invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const announcer = await getAnnouncerDetails(uid);
  if (!announcer) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Annonceur introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  return jsonSuccess({ announcer }, auth.correlationId);
}
