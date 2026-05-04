import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getPlatformUserDetails } from "@/modules/user-management/application/user-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

type RouteContext = {
  params: Promise<{ uid: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "users.read");

  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const uid = params.uid?.trim();

  if (!uid) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant utilisateur invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const user = await getPlatformUserDetails(uid);
  if (!user) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Utilisateur introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  return jsonSuccess({ user }, auth.correlationId);
}
