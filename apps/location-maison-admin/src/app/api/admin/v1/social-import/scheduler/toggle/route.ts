import { NextRequest } from "next/server";

import { jsonError } from "@/lib/api/response";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

export async function POST(request: NextRequest) {
  const auth = await requireSocialImportPermission(
    request,
    "social_import.scheduler.manage",
  );
  if (!auth.ok) {
    return auth.response;
  }

  return jsonError(
    {
      code: "VALIDATION_ERROR",
      message:
        "La logique paramètres/scheduler social import est supprimée.",
    },
    410,
    auth.correlationId,
  );
}
