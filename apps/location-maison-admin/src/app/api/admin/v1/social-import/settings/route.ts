import { NextRequest } from "next/server";

import { jsonError } from "@/lib/api/response";
import { requireSocialImportPermission } from "@/modules/social-import/presentation/social-import-guard";

function disabledResponse(correlationId: string) {
  return jsonError(
    {
      code: "VALIDATION_ERROR",
      message:
        "La logique paramètres/scheduler social import est supprimée.",
    },
    410,
    correlationId,
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireSocialImportPermission(
    request,
    "social_import.settings.read",
  );
  if (!auth.ok) {
    return auth.response;
  }
  return disabledResponse(auth.correlationId);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSocialImportPermission(
    request,
    "social_import.settings.update",
  );
  if (!auth.ok) {
    return auth.response;
  }
  return disabledResponse(auth.correlationId);
}
